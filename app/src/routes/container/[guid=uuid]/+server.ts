import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import { etag, predicates } from '$lib/models';
import { deleteContainer, deleteContainerRecursively, getContainerByGuid } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	try {
		const container = await locals.pool.connect(getContainerByGuid(params.guid));
		if (!defineAbilityFor(locals.user).can('read', container)) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}
		return json(container);
	} catch (e) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (!request.headers.has('If-Match')) {
		error(428, { message: unwrapFunctionStore(_)('error.precondition_required') });
	}

	try {
		const container = await locals.pool.connect(getContainerByGuid(params.guid));
		if (etag(container) != request.headers.get('If-Match')) {
			error(412, { message: unwrapFunctionStore(_)('error.precondition_failed') });
		}
		const ability = defineAbilityFor(locals.user);
		if (ability.can('delete-recursively', container)) {
			await locals.pool.connect(
				deleteContainerRecursively({
					...container,
					user: [{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }]
				})
			);
			return new Response(null, { status: 204 });
		} else if (ability.can('delete', container)) {
			await locals.pool.connect(
				deleteContainer({
					...container,
					user: [{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }]
				})
			);
			return new Response(null, { status: 204 });
		} else {
			error(403, { message: unwrapFunctionStore(_)('error.unauthorized') });
		}
	} catch (e) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;
