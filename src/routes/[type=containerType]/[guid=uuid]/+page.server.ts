import { getAllRelationObjects, getContainerByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	const relationObjects = await locals.pool.connect(getAllRelationObjects(container));
	return { container, relationObjects };
}) satisfies PageServerLoad;
