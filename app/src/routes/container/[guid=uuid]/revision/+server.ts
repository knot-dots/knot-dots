import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { etag, modifiedContainer, predicates } from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getContainerByGuid,
	updateContainer
} from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	try {
		return json(
			filterVisible(
				await locals.pool.connect(getAllContainerRevisionsByGuid(params.guid)),
				locals.user
			)
		);
	} catch (e) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;

export const POST = (async ({ locals, params, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const container = await locals.pool.connect(getContainerByGuid(params.guid)).catch((reason) => {
		if (reason instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw reason;
		}
	});

	if (request.headers.has('If-Match') && etag(container) != request.headers.get('If-Match')) {
		error(412, { message: unwrapFunctionStore(_)('error.precondition_failed') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});
	const parseResult = modifiedContainer.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
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
