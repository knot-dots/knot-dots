import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	computeFacetCount,
	type Container,
	fromCounts,
	indicatorCategories,
	type IndicatorPayload,
	indicatorTypes,
	payloadTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import { getAllContainersRelatedToIndicators, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/server/categoryOptions';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const { categoryContext: rawCategoryContext, currentOrganization } = await parent();
	const features = createFeatureDecisions(locals.features);
	const categoryContext = rawCategoryContext
		? filterCategoryContext(rawCategoryContext, [
				payloadTypes.enum.objective,
				payloadTypes.enum.effect,
				payloadTypes.enum.indicator
			])
		: null;
	const useCustomCategories = features.useCustomCategories();

	const customCategories = useCustomCategories
		? extractCustomCategoryFilters(url, categoryContext?.keys ?? [])
		: {};

	const coreCategoryFilters = useCustomCategories
		? {}
		: {
				audience: url.searchParams.getAll('audience'),
				sdg: url.searchParams.getAll('sdg'),
				policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
				topics: url.searchParams.getAll('topic')
			};

	let containers: Container<IndicatorPayload>[];
	let data: Record<string, Record<string, number>> | undefined;
	if (features.useElasticsearch()) {
		const esResult = await locals.pool.connect(
			getManyContainersWithES(
				[currentOrganization.guid],
				{
					...coreCategoryFilters,
					customCategories,
					indicatorCategories: url.searchParams.getAll('indicatorCategory'),
					indicatorTypes: url.searchParams.getAll('indicatorType'),
					type: [payloadTypes.enum.indicator]
				},
				'',
				undefined,
				{ customCategoryKeys: categoryContext?.keys ?? [], includeFacets: true }
			)
		);
		containers = esResult.containers as Container<IndicatorPayload>[];
		data = esResult.facets;
	} else {
		containers = (await locals.pool.connect(
			getManyContainers(
				[currentOrganization.guid],
				{
					...coreCategoryFilters,
					customCategories,
					indicatorCategories: url.searchParams.getAll('indicatorCategory'),
					indicatorTypes: url.searchParams.getAll('indicatorType'),
					type: [payloadTypes.enum.indicator]
				},
				''
			)
		)) as Container<IndicatorPayload>[];
	}

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(containers, {})
	);

	const filtered = filterVisible([...containers, ...relatedContainers], locals.user);

	const _facets = new Map<string, Map<string, number>>([
		['indicatorType', fromCounts(indicatorTypes.options as string[], data?.indicatorType)],
		[
			'indicatorCategory',
			fromCounts(indicatorCategories.options as string[], data?.indicatorCategory)
		]
	]);

	if (useCustomCategories && categoryContext) {
		const customFacets = buildCategoryFacetsWithCounts(
			categoryContext.options,
			data ? Object.fromEntries(Object.entries(data)) : {}
		);
		for (const [key, values] of customFacets.entries()) {
			_facets.set(key, values);
		}
	} else {
		_facets.set('audience', fromCounts(audience.options as string[], data?.audience));
		_facets.set('sdg', fromCounts(sustainableDevelopmentGoals.options as string[], data?.sdg));
		_facets.set('topic', fromCounts(topics.options as string[], data?.topic));
		_facets.set(
			'policyFieldBNK',
			fromCounts(policyFieldBNK.options as string[], data?.policyFieldBNK)
		);
	}

	const facets =
		features.useElasticsearch() && data ? _facets : computeFacetCount(_facets, filtered);

	return {
		container: currentOrganization,
		containers: filtered,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
