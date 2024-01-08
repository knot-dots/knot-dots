import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isMeasureContainer } from '$lib/models';
import { getContainerByGuid, getManyTaskContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isMeasureContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const containers = await locals.pool.connect(
		getManyTaskContainers({
			measure: container.revision,
			taskCategories: url.searchParams.getAll('taskCategory'),
			terms: url.searchParams.get('terms') ?? ''
		})
	);

	return { container, containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
