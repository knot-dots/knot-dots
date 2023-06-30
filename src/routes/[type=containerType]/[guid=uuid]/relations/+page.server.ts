import {
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
			url.searchParams.getAll('category'),
			url.searchParams.getAll('topic'),
			url.searchParams.getAll('strategyType'),
			url.searchParams.get('terms') ?? '',
			url.searchParams.get('sort') ?? ''
		)
	);

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const container = await locals.pool.connect(getContainerByGuid(guid));
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.payload.type)),
			locals.pool.connect(getAllDirectlyRelatedContainers(container))
		]);
		overlayData = { container, isPartOfOptions, relatedContainers };
	}

	return { allRelatedContainers, container, overlayData, relatedContainers };
}) satisfies PageServerLoad;
