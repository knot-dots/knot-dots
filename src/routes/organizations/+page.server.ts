import { getManyOrganizationContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	let overlayData;

	const containers = await locals.pool.connect(
		getManyOrganizationContainers(url.searchParams.get('sort') ?? '')
	);

	return { containers, overlayData };
}) satisfies PageServerLoad;
