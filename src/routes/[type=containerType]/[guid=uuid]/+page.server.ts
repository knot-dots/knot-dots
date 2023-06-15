import { getAllDirectlyRelatedContainers, getContainerByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	const relatedContainers = await locals.pool.connect(getAllDirectlyRelatedContainers(container));
	return { container, relatedContainers };
}) satisfies PageServerLoad;
