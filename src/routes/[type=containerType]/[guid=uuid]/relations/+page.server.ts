import {
	getAllContainerRevisionsByGuid,
	getAllContainersWithIndicatorContributions,
	getAllRelatedContainers,
	getAllRelatedInternalObjectives,
	getContainerByGuid,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, url }) => {
	let overlayData;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	const [containersWithIndicatorContributions, allRelatedContainers] = await Promise.all([
		locals.pool.connect(getAllContainersWithIndicatorContributions([container.organization])),
		params.type.includes('internal_objective')
			? locals.pool.connect(
					getAllRelatedInternalObjectives(params.guid, url.searchParams.get('sort') ?? '')
			  )
			: locals.pool.connect(
					getAllRelatedContainers(
						[container.organization],
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
	]);

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(
				maybePartOf(container.organizational_unit ?? container.organization, container.payload.type)
			),
			params.type.includes('internal_objective')
				? locals.pool.connect(getAllRelatedInternalObjectives(params.guid, ''))
				: locals.pool.connect(getAllRelatedContainers([container.organization], guid, {}, ''))
		]);
		overlayData = { isPartOfOptions, relatedContainers, revisions };
	}

	return { allRelatedContainers, container, containersWithIndicatorContributions, overlayData };
}) satisfies PageServerLoad;
