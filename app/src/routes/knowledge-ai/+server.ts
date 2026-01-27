import { error } from '@sveltejs/kit';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { produce } from 'sveltekit-sse';
import { z } from 'zod';
import { env } from '$env/dynamic/public';
import { createFeatureDecisions } from '$lib/features';
import {
	editorialState,
	emptyContainer,
	isProgramContainer,
	type NewContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import { pollJobStatus, startJob } from '$lib/server/knowledge-ai';
import { createContainer, getContainerByGuid } from '$lib/server/db';
import type { RequestHandler } from './$types';

function delay(milliseconds: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

export const POST = (async ({ locals, request }) => {
	if (!createFeatureDecisions(locals.features).useAI()) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const formData = await request.formData();
	const parsedFormData = z.string().uuid().safeParse(formData.get('program'));
	if (parsedFormData.error) {
		error(400, { message: parsedFormData.error.message });
	}

	const container = await locals.pool.connect(
		getContainerByGuid(formData.get('program') as string)
	);
	if (!isProgramContainer(container)) {
		error(400, { message: unwrapFunctionStore(_)('error.bad_request') });
	}

	const pdfResponse = await fetch(container.payload.pdf[0][0]);
	const pdfFile = new File([await pdfResponse.blob()], 'document.pdf', { type: 'application/pdf' });

	const startJobResponse = await startJob(pdfFile);
	if (startJobResponse.error) {
		error(422, { message: startJobResponse.error.message });
	}

	const job = startJobResponse.data.job_id;

	return produce(
		async ({ emit, lock }) => {
			let position = 0;

			log.info(`start processing job ${job}`);
			let status = 'processing';

			while (status === 'processing') {
				log.debug(`polling status of job ${job}`);

				const parsedPollResponse = await pollJobStatus(job);

				if (parsedPollResponse.error) {
					log.error(parsedPollResponse.error.message);
					return;
				}

				status = parsedPollResponse.data.status;

				log.debug(`job ${job} is ${status}`);

				const { error } = emit('message', status);
				if (error) {
					log.error(serializeError(error), String(error));
				}

				if (status === 'completed') {
					for (const object of parsedPollResponse.data.data!.knowledge_objects) {
						try {
							const newContainer = emptyContainer.parse({
								managed_by: container.managed_by,
								organization: container.organization,
								organizational_unit: container.organizational_unit,
								payload: {
									aiSuggestion: true,
									category: object.category.map((c) => c.substring(0, 6)),
									description: object.description,
									editorialState: editorialState.enum['editorial_state.draft'],
									summary: object.summary,
									title: object.title,
									topic: object.topic,
									type: payloadTypes.enum.knowledge
								},
								realm: env.PUBLIC_KC_REALM,
								relation: [
									{
										object: container.guid,
										position: position++,
										predicate: predicates.enum['is-part-of-program']
									}
								],
								user: [
									{
										predicate: predicates.enum['is-creator-of'],
										subject: locals.user.guid
									}
								]
							}) as NewContainer;
							await locals.pool.connect(createContainer(newContainer));
						} catch (error) {
							log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
						}
					}

					log.info(`job ${job} completed`);
				}

				await delay(10000);
			}

			const { error } = emit('message', 'complete');
			if (error) {
				log.error(serializeError(error), String(error));
			}

			lock.set(false);
		},
		{
			stop() {
				log.info('client disconnected');
			}
		}
	);
}) satisfies RequestHandler;
