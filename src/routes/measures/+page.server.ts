import {
	getAllRelatedContainers,
	getAllDirectlyRelatedContainers,
	getContainerByGuid,
	getManyContainersByType,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	let containers;
	let containerPreviewData;
	let isPartOfOptions;
	let relatedContainers;
	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(url.searchParams.get('related-to') as string)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainersByType(
				'measure',
				url.searchParams.getAll('category'),
				url.searchParams.getAll('topic'),
				url.searchParams.getAll('strategyType'),
				url.searchParams.get('terms') ?? '',
				url.searchParams.get('sort') ?? ''
			)
		);
	}
	if (url.searchParams.has('container-preview')) {
		const previewGuid = url.searchParams.get('container-preview') ?? '';
		containerPreviewData = await locals.pool.connect(getContainerByGuid(previewGuid));
		[isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(containerPreviewData.payload.type)),
			locals.pool.connect(getAllDirectlyRelatedContainers(containerPreviewData))
		]);
	}
	return { containers, containerPreviewData, isPartOfOptions, relatedContainers };
}) satisfies PageServerLoad;
