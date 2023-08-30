import {
	getAllContainerRevisionsByGuid,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyOrganizationalUnitContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers;
	let overlayData;

	const { currentOrganization: container } = await parent();

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(url.searchParams.get('related-to') as string)
		);
	} else {
		containers = await locals.pool.connect(
			getManyOrganizationalUnitContainers({ organization: container.guid })
		);
	}

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.organization, container.payload.type)),
			locals.pool.connect(getAllRelatedContainers([container.organization], guid, {}, ''))
		]);
		overlayData = {
			isPartOfOptions,
			relatedContainers,
			revisions
		};
	}

	return { container, containers, overlayData };
}) satisfies PageServerLoad;
