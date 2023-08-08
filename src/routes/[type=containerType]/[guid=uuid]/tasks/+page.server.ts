import {
	getAllContainersRelatedToMeasure,
	getAllContainerRevisionsByGuid,
	getAllRelatedContainers,
	maybePartOf,
	getContainerByGuid
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const measure = await locals.pool.connect(getContainerByGuid(params.guid));
	let containers
	let overlayData;

  containers = await locals.pool.connect(
    getAllContainersRelatedToMeasure(
			measure.revision,
			{ type: 'internal_objective.task' },
			url.searchParams.get('sort') ?? ''
		)
  );
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
	return { containers, measure, overlayData };
}) satisfies PageServerLoad;
