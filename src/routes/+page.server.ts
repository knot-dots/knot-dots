import {
	getAllContainerRevisionsByGuid,
	getAllContainersWithIndicatorContributions,
	getAllRelatedContainers,
	getAllRelatedContainersByStrategyType,
	getManyContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers;
	let containersWithIndicatorContributions;
	let overlayData;
	const { currentOrganization } = await parent();
	if (url.searchParams.has('related-to')) {
		[containers, containersWithIndicatorContributions] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					{},
					''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		]);
	} else if (url.searchParams.has('strategyType')) {
		[containers, containersWithIndicatorContributions] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainersByStrategyType(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.getAll('strategyType'),
					{
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						terms: url.searchParams.get('terms') ?? ''
					},
					url.searchParams.get('sort') ?? ''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		]);
	} else {
		[containers, containersWithIndicatorContributions] = await Promise.all([
			locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						strategyTypes: url.searchParams.getAll('strategyType'),
						terms: url.searchParams.get('terms') ?? ''
					},
					url.searchParams.get('sort') ?? ''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		]);
	}
	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.organization, container.payload.type)),
			locals.pool.connect(getAllRelatedContainers([container.organization], guid, {}, ''))
		]);
		overlayData = {
			isPartOfOptions,
			relatedContainers,
			revisions
		};
	}
	return { containers, containersWithIndicatorContributions, overlayData };
}) satisfies PageServerLoad;
