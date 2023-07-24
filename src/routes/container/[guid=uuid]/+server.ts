import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
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

export const DELETE = (async ({ locals, params }) => {
	if (locals.user == null) {
		throw error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	try {
		const container = await locals.pool.connect(getContainerByGuid(params.guid));
		await locals.pool.connect(deleteContainer({ ...container, user: [locals.user] }));
		return new Response(null, { status: 204 });
	} catch (e) {
		if (e instanceof NotFoundError) {
			throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;
