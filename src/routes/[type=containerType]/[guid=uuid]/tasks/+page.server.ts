import {
	getAllContainersRelatedToMeasure,
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getContainerByGuid,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	let overlayData;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	const containers = await locals.pool.connect(
		getAllContainersRelatedToMeasure(
			container.revision,
			{ terms: url.searchParams.get('terms') ?? '', type: 'internal_objective.task' },
			url.searchParams.get('sort') ?? ''
		)
	);
	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.payload.type)),
			locals.pool.connect(
				getAllRelatedInternalObjectives(params.guid, url.searchParams.get('sort') ?? '')
			)
		]);
		overlayData = {
			isPartOfOptions,
			relatedContainers,
			revisions
		};
	}
	return { container, containers, overlayData };
}) satisfies PageServerLoad;
