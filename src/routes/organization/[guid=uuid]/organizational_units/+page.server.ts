import {
	getAllContainerRevisionsByGuid,
	getAllRelatedContainers,
	getManyOrganizationalUnitContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	let overlayData;

	const containers = await locals.pool.connect(
		getManyOrganizationalUnitContainers(url.searchParams.get('sort') ?? '')
	);

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

	return { containers, overlayData };
}) satisfies PageServerLoad;
