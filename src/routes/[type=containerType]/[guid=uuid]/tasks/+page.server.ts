import { filterVisible } from '$lib/authorization';
import { getContainerByGuid, getManyTaskContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	const containers = await locals.pool.connect(
		getManyTaskContainers({
			measure: container.revision,
			taskCategories: url.searchParams.getAll('taskCategory'),
			terms: url.searchParams.get('terms') ?? ''
		})
	);
	return { container, containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
