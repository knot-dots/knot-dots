import {
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, params }) => {
	let containers;

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

	return { container, containers };
}) satisfies PageServerLoad;
