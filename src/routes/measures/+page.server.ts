import {
	getAllRelatedContainers,
	getAllRelationObjects,
	getContainerByGuid,
	getManyContainersByType
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	let containers;
	let containerPreviewData;
	let relationObjects;
	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(url.searchParams.get('related-to') as string)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainersByType(
				'measure',
				url.searchParams.getAll('category'),
				url.searchParams.get('sort') ?? ''
			)
		);
	}
	if (url.searchParams.has('container-preview')) {
		const previewGuid = url.searchParams.get('container-preview') ?? '';
		containerPreviewData = await locals.pool.connect(getContainerByGuid(previewGuid));
		relationObjects = await locals.pool.connect(getAllRelationObjects(containerPreviewData));
	}
	return { containers, containerPreviewData, relationObjects };
}) satisfies PageServerLoad;
