import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { env as privateEnv } from '$env/dynamic/private';
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
import { createContainer, getContainerByGuid } from '$lib/server/db';
import type { RequestHandler } from './$types';

const aiResponseSchema = z.union([
	z.object({
		projects: z.array(
			z.object({
				Content: z.string(),
				Status: z.string(),
				'Short Description': z.string(),
				Title: z.string()
			})
		)
	}),
	z.object({ detail: z.string() }).strict()
]);

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
	const payload = new FormData();
	payload.append('file', await pdfResponse.blob());
	const aiResponse = await fetch(privateEnv.AI_URL as string, {
		body: payload,
		method: 'POST'
	});

	if (!aiResponse.ok) {
		error(500, { message: unwrapFunctionStore(_)('error.internal_server_error') });
	}

	const parsedAiResponse = aiResponseSchema.parse(await aiResponse.json());

	if ('detail' in parsedAiResponse) {
		error(422, { message: parsedAiResponse.detail });
	}

	const containers = parsedAiResponse.projects.map(
		(p, i) =>
			emptyContainer.parse({
				managed_by: container.managed_by,
				organization: container.organization,
				organizational_unit: container.organizational_unit,
				payload: {
					aiSuggestion: true,
					description: p.Content,
					editorialState: editorialState.enum['editorial_state.draft'],
					summary: p['Short Description'].substring(0, 200),
					title: p.Title,
					type: payloadTypes.enum.measure
				},
				realm: env.PUBLIC_KC_REALM,
				relation: [
					{
						object: container.guid,
						position: i,
						predicate: predicates.enum['is-part-of-program']
					}
				],
				user: [
					{
						predicate: predicates.enum['is-creator-of'],
						subject: locals.user.guid
					}
				]
			}) as NewContainer
	);

	await locals.pool.transaction(async (connection) => {
		for (const container of containers) {
			await createContainer(container)(connection);
		}
	});

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
