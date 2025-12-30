import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import { audience, type Container, type IndicatorContainer, payloadTypes } from '$lib/models';
import { getAllContainersRelatedToIndicators, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const { currentOrganization } = await parent();
	const features = createFeatureDecisions(locals.features);
	const containers = (await locals.pool.connect(
		features.useElasticsearch()
			? getManyContainersWithES(
					[currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						indicatorCategories: url.searchParams.getAll('indicatorCategory'),
						indicatorTypes: url.searchParams.getAll('indicatorType'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						type: [payloadTypes.enum.indicator]
					},
					''
				)
			: getManyContainers(
					[currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						indicatorCategories: url.searchParams.getAll('indicatorCategory'),
						indicatorTypes: url.searchParams.getAll('indicatorType'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						type: [payloadTypes.enum.indicator]
					},
					''
				)
	)) as IndicatorContainer[];

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(containers, {})
	);

	const filtered = filterVisible([...containers, ...relatedContainers], locals.user);
	const facets = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: {};

	return {
		container: currentOrganization,
		containers: filtered,
		facets
	};
}) satisfies PageServerLoad;
