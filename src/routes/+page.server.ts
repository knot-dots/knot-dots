import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	const containers = await locals.pool.connect(
		getManyContainers(url.searchParams.getAll('category'), url.searchParams.get('sort') ?? '')
	);
	return { containers };
}) satisfies PageServerLoad;
