import { getAllRelatedOrganizationalUnitContainers, getContainerByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import type { OrganizationalUnitContainer } from '$lib/models';

export const load = (async ({ locals, url, params }) => {
	let containers;

	const container = (await locals.pool.connect(
		getContainerByGuid(params.guid)
	)) as OrganizationalUnitContainer;

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(url.searchParams.get('related-to') as string)
		);
	} else {
		containers = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(container.guid)
		);
	}

	return { container, containers };
}) satisfies PageServerLoad;
