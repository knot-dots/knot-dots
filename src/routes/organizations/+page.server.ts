import { getAllContainerRevisionsByGuid, getManyOrganizationContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import type { OrganizationContainer } from '$lib/models';

export const load = (async ({ locals, url }) => {
	let overlayData;

	const containers = await locals.pool.connect(
		getManyOrganizationContainers(url.searchParams.get('sort') ?? '')
	);

	if (url.searchParams.has('container-preview')) {
		const revisions = (await locals.pool.connect(
			getAllContainerRevisionsByGuid(url.searchParams.get('container-preview') ?? '')
		)) as OrganizationContainer[];
		overlayData = { revisions };
	}

	return { containers, overlayData };
}) satisfies PageServerLoad;
