import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { getAllContainersRelatedToUser, getUser } from '$lib/server/db';
import { filterVisible } from '$lib/authorization';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	try {
		const containers = await locals.pool.transaction(async (txConnection) => {
			await getUser(params.guid)(txConnection);
			return getAllContainersRelatedToUser(params.guid)(txConnection);
		});
		return json(filterVisible(containers, locals.user));
	} catch (e) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;
