import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { modifiedContainer, predicates } from '$lib/models';
import { getAllContainerRevisionsByGuid, updateContainer } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { NotFoundError } from 'slonik';

export const GET = (async ({ locals, params }) => {
	try {
		return json(await locals.pool.connect(getAllContainerRevisionsByGuid(params.guid)));
	} catch (e) {
		if (e instanceof NotFoundError) {
			throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
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
	const parseResult = modifiedContainer.safeParse(data);

	if (!parseResult.success) {
		throw error(422, parseResult.error);
	} else {
		const result = await locals.pool.connect(
			updateContainer({
				...parseResult.data,
				user: [
					...parseResult.data.user.filter(
						({ predicate }) => predicate != predicates.enum['is-creator-of']
					),
					{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }
				]
			})
		);
		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;
