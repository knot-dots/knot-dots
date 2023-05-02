import { getContainerByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	return await locals.pool.connect(getContainerByGuid(params.guid));
}) satisfies PageServerLoad;
