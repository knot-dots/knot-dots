import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const containers = await locals.pool.connect(getManyContainers());
	return { containers };
}) satisfies PageServerLoad;
