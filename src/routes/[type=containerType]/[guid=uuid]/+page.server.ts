import { getAllRelatedContainers, getContainerByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	const relatedContainers = await locals.pool.connect(
		getAllRelatedContainers(container.guid, {}, '')
	);
	return { container, relatedContainers };
}) satisfies PageServerLoad;
