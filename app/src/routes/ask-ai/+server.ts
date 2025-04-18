import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { createFeatureDecisions } from '$lib/features';
import {
	emptyContainer,
	isStrategyContainer,
	type NewContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import { createContainer, getContainerByGuid } from '$lib/server/db';
import type { RequestHandler } from './$types';

const aiResponseSchema = z.object({
	projects: z.array(
		z.object({
			Content: z.string(),
			Status: z.string(),
			'Short Description': z.string(),
			Title: z.string()
		})
	)
});

// type Project = z.infer<typeof aiResponseSchema>['projects'][0];

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
	const parsedFormData = z.string().uuid().safeParse(formData.get('strategy'));
	if (parsedFormData.error) {
		error(400, { message: parsedFormData.error.message });
	}

	const container = await locals.pool.connect(
		getContainerByGuid(formData.get('strategy') as string)
	);
	if (!isStrategyContainer(container)) {
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

	const containers = aiResponseSchema.parse(await aiResponse.json()).projects.map(
		(p, i) =>
			emptyContainer.parse({
				managed_by: container.managed_by,
				organization: container.organization,
				organizational_unit: container.organizational_unit,
				payload: {
					aiSuggestion: true,
					description: p.Content,
					summary: p['Short Description'].substring(0, 200),
					title: p.Title,
					type: payloadTypes.enum.measure
				},
				realm: env.PUBLIC_KC_REALM,
				relation: [
					{
						object: container.guid,
						position: i,
						predicate: predicates.enum['is-part-of-strategy']
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
