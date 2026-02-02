import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	type IndicatorContainer,
	payloadTypes,
	computeFacetCount,
	fromCounts,
	indicatorCategories,
	indicatorTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import { getAllContainersRelatedToIndicators, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const { currentOrganization } = await parent();
	const customCategories = extractCustomCategoryFilters(url);
	const features = createFeatureDecisions(locals.features);
	const containers = (await locals.pool.connect(
		features.useElasticsearch()
			? getManyContainersWithES(
					[currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						customCategories,
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
						customCategories,
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

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		['indicatorType', fromCounts(indicatorTypes.options as string[], data?.indicatorType)],
		[
			'indicatorCategory',
			fromCounts(indicatorCategories.options as string[], data?.indicatorCategory)
		],
		['audience', fromCounts(audience.options as string[], data?.audience)],
		['category', fromCounts(sustainableDevelopmentGoals.options as string[], data?.category)],
		['topic', fromCounts(topics.options as string[], data?.topic)],
		['policyFieldBNK', fromCounts(policyFieldBNK.options as string[], data?.policyFieldBNK)]
	]);

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, filtered);

	return {
		container: currentOrganization,
		containers: filtered,
		facets
	};
}) satisfies PageServerLoad;
