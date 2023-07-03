import {
	getAllRelatedContainers,
	getAllDirectlyRelatedContainers,
	getContainerByGuid,
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
					terms: url.searchParams.get('terms') ?? ''
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}
	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const container = await locals.pool.connect(getContainerByGuid(guid));
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.payload.type)),
			locals.pool.connect(getAllDirectlyRelatedContainers(container))
		]);
		overlayData = { container, isPartOfOptions, relatedContainers };
	}
	return { containers, overlayData };
}) satisfies PageServerLoad;
