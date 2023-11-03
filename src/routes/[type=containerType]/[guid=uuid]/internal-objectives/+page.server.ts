import { filterVisible } from '$lib/authorization';
import {
	getAllContainersRelatedToMeasure,
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getContainerByGuid
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	let containers;
	let relationOverlayData;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedInternalObjectives(
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relations').length == 0
					? ['hierarchical', 'other']
					: url.searchParams.getAll('relations'),
				''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getAllContainersRelatedToMeasure(
				container.revision,
				{ terms: url.searchParams.get('terms') ?? '' },
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	if (url.searchParams.has('container-relations')) {
		const guid = url.searchParams.get('container-relations') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		relationOverlayData = { object: container };
	}

	return {
		container,
		containers: filterVisible(containers, locals.user),
		relationOverlayData
	};
}) satisfies PageServerLoad;
