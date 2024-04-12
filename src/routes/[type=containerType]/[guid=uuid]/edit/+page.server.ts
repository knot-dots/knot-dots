import { getContainerByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { isPageContainer } from '$lib/models';
import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';

export const load = (async ({ params, locals }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isPageContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	return { container };
}) satisfies PageServerLoad;
