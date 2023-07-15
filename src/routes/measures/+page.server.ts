import {
	getAllContainerRevisionsByGuid,
	getAllDirectlyRelatedContainers,
	getAllRelatedContainers,
	getAllRelatedContainersByStrategyType,
	getManyContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	let containers;
	let overlayData;
	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(url.searchParams.get('related-to') as string, {}, '')
		);
	} else if (url.searchParams.has('strategyType')) {
		containers = await locals.pool.connect(
			getAllRelatedContainersByStrategyType(
				url.searchParams.getAll('strategyType'),
				{
					categories: url.searchParams.getAll('category'),
					topics: url.searchParams.getAll('topic'),
					terms: url.searchParams.get('terms') ?? ''
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				{
					categories: url.searchParams.getAll('category'),
					topics: url.searchParams.getAll('topic'),
					strategyTypes: url.searchParams.getAll('strategyType'),
					terms: url.searchParams.get('terms') ?? '',
					type: 'measure'
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}
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
	return { containers, overlayData };
}) satisfies PageServerLoad;
