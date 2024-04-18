import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isIndicatorContainer } from '$lib/models';
import { getAllContainersWithParentObjectives, getContainerByGuid } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isIndicatorContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const containers = await locals.pool.connect(getAllContainersWithParentObjectives(container));

	return json(filterVisible(containers, locals.user));
}) satisfies RequestHandler;
