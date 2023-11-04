import { filterVisible } from '$lib/authorization';
import {
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, params }) => {
	let containers;
	let overlayData;

	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(url.searchParams.get('related-to') as string)
		);
	} else {
		containers = await locals.pool.connect(
			getManyOrganizationalUnitContainers({ organization: container.guid })
		);
	}

	return { container, containers: filterVisible(containers, locals.user), overlayData };
}) satisfies PageServerLoad;
