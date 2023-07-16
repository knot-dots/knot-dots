import {
	getAllContainerRevisionsByGuid,
	getAllRelatedContainers,
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
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				{
					categories: url.searchParams.getAll('category'),
					topics: url.searchParams.getAll('topic'),
					strategyTypes: url.searchParams.getAll('strategyType'),
					terms: url.searchParams.get('terms') ?? '',
					type: 'strategy'
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
			locals.pool.connect(getAllRelatedContainers(guid, {}, ''))
		]);
		overlayData = {
			isPartOfOptions,
			relatedContainers,
			revisions
		};
	}
	return { containers, overlayData };
}) satisfies PageServerLoad;
