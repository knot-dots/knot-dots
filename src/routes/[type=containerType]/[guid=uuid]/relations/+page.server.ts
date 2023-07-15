import {
	getAllContainerRevisionsByGuid,
	getAllDirectlyRelatedContainers,
	getAllRelatedContainers,
	getContainerByGuid,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, url }) => {
	let overlayData;

	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	const relatedContainers = await locals.pool.connect(getAllDirectlyRelatedContainers(container));
	const allRelatedContainers = await locals.pool.connect(
		getAllRelatedContainers(
			container.guid,
			{
				categories: url.searchParams.getAll('category'),
				topics: url.searchParams.getAll('topic'),
				strategyTypes: url.searchParams.getAll('strategyType'),
				terms: url.searchParams.get('terms') ?? ''
			},
			url.searchParams.get('sort') ?? ''
		)
	);

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.payload.type)),
			locals.pool.connect(getAllDirectlyRelatedContainers(container))
		]);
		overlayData = { isPartOfOptions, relatedContainers, revisions };
	}

	return { allRelatedContainers, container, overlayData, relatedContainers };
}) satisfies PageServerLoad;
