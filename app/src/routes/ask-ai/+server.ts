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
	predicates
} from '$lib/models';
import { pollJobStatus, startGoalsJob, startJob } from '$lib/server/ai';
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

	const startGoalsJobResponse = await startGoalsJob(pdfFile);
	if (startGoalsJobResponse.error) {
		error(422, { message: startGoalsJobResponse.error.message });
	}

	const extracted = new Set();

	return produce(
		async ({ emit, lock }) => {
			let position = 0;

			for (const job of [startGoalsJobResponse.data.job_id, startJobResponse.data.job_id]) {
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

					for (const { id, project } of parsedPollResponse.data.completed_projects) {
						if (!extracted.has(id)) {
							try {
								const newContainer = emptyContainer.parse({
									managed_by: container.managed_by,
									organization: container.organization,
									organizational_unit: container.organizational_unit,
									payload: {
										aiSuggestion: true,
										category: project.sdg,
										description: project.description,
										editorialState: editorialState.enum['editorial_state.draft'],
										...('goalType' in project ? { goalType: project.goalType } : undefined),
										...('status' in project ? { status: project.status } : undefined),
										title: project.title,
										topic: project.topicArea,
										type: project.type
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
							} finally {
								extracted.add(id);
							}
						}
					}

					if (status === 'processing') {
						const { error } = emit('message', `${status} ${position}`);
						if (error) {
							log.error(serializeError(error), String(error));
						}
					} else if (status === 'complete') {
						log.info(`job ${job} complete`);
					}

					await delay(10000);
				}
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
