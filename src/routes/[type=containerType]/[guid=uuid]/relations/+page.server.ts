import {
	getAllContainerRevisionsByGuid,
	getAllContainersWithIndicatorContributions,
	getAllRelatedContainers,
	getContainerByGuid,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, url }) => {
	let overlayData;

	const [container, containersWithIndicatorContributions, allRelatedContainers] = await Promise.all(
		[
			locals.pool.connect(getContainerByGuid(params.guid)),
			locals.pool.connect(getAllContainersWithIndicatorContributions()),
			locals.pool.connect(
				getAllRelatedContainers(
					params.guid,
					{
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						strategyTypes: url.searchParams.getAll('strategyType'),
						terms: url.searchParams.get('terms') ?? ''
					},
					url.searchParams.get('sort') ?? ''
				)
			)
		]
	);

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.payload.type)),
			locals.pool.connect(getAllRelatedContainers(guid, {}, ''))
		]);
		overlayData = { isPartOfOptions, relatedContainers, revisions };
	}

	return { allRelatedContainers, container, containersWithIndicatorContributions, overlayData };
}) satisfies PageServerLoad;
