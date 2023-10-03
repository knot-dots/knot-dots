import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { etag, predicates } from '$lib/models';
import { deleteContainer, getContainerByGuid } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	try {
		return json(await locals.pool.connect(getContainerByGuid(params.guid)));
	} catch (e) {
		if (e instanceof NotFoundError) {
			throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params, request }) => {
	if (!locals.user.isAuthenticated) {
		throw error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (!request.headers.has('If-Match')) {
		throw error(428, { message: unwrapFunctionStore(_)('error.precondition_required') });
	}

	try {
		const container = await locals.pool.connect(getContainerByGuid(params.guid));
		if (etag(container) != request.headers.get('If-Match')) {
			throw error(412, { message: unwrapFunctionStore(_)('error.precondition_failed') });
		}
		await locals.pool.connect(
			deleteContainer({
				...container,
				user: [{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }]
			})
		);
		return new Response(null, { status: 204 });
	} catch (e) {
		if (e instanceof NotFoundError) {
			throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;
