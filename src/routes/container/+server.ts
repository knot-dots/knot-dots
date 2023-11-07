import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { newContainer, payloadTypes, predicates } from '$lib/models';
import {
	createContainer,
	getAllContainersRelatedToStrategy,
	getManyContainers
} from '$lib/server/db';
import type { RequestHandler } from './$types';
import { filterVisible } from '$lib/authorization';

export const GET = (async ({ locals, url }) => {
	const expectedParams = z.object({
		isPartOfStrategy: z.array(z.coerce.number().int().positive()),
		organization: z.array(z.string().uuid()),
		organizationalUnit: z.array(z.string().uuid()),
		payloadType: z.array(payloadTypes)
	});
	const parseResult = expectedParams.safeParse(
		Object.fromEntries(
			Object.keys(expectedParams.shape).map((key) => [key, url.searchParams.getAll(key)])
		)
	);

	if (!parseResult.success) {
		throw error(400, { message: parseResult.error.message });
	}

	const containers =
		parseResult.data.isPartOfStrategy.length > 0
			? await locals.pool.connect(
					getAllContainersRelatedToStrategy(parseResult.data.isPartOfStrategy[0], {
						type: parseResult.data.payloadType
					})
			  )
			: await locals.pool.connect(
					getManyContainers(
						parseResult.data.organization,
						{
							organizationalUnits: parseResult.data.organizationalUnit,
							type: parseResult.data.payloadType
						},
						''
					)
			  );

	return json(filterVisible(containers, locals.user));
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		throw error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		throw error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		throw error(400, { message: reason.message });
	});
	const parseResult = newContainer.safeParse(data);

	if (!parseResult.success) {
		throw error(422, parseResult.error);
	} else {
		const result = await locals.pool.connect(
			createContainer({
				...parseResult.data,
				user: [{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }]
			})
		);
		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;
