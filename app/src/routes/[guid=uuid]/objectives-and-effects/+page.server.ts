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
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const { currentOrganization, defaultOrganizationGuid } = await parent();
	const customCategories = extractCustomCategoryFilters(url);
	const features = createFeatureDecisions(locals.features);

	const organizationScope = Array.from(
		new Set(
			[currentOrganization.guid, defaultOrganizationGuid].filter((guid): guid is string =>
				Boolean(guid)
			)
		)
	);

	const categoryContext = features.useCustomCategories()
		? await loadCategoryContext({
				connect: locals.pool.connect,
				organizationScope,
				fallbackScope: [],
				user: locals.user,
				objectTypes: [
					payloadTypes.enum.objective,
					payloadTypes.enum.effect,
					payloadTypes.enum.indicator
				]
			})
		: null;
	const containers = (await locals.pool.connect(
		features.useElasticsearch()
			? getManyContainersWithES(
					[currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
							sdg: url.searchParams.getAll('sdg'),
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
						sdg: url.searchParams.getAll('sdg'),
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
		? await getFacetAggregationsForGuids(
				filtered.map((c) => c.guid),
				categoryContext?.keys ?? []
			)
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		['indicatorType', fromCounts(indicatorTypes.options as string[], data?.indicatorType)],
		[
			'indicatorCategory',
			fromCounts(indicatorCategories.options as string[], data?.indicatorCategory)
		]
	]);

	if (features.useCustomCategories() && categoryContext) {
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

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, filtered);

	return {
		container: currentOrganization,
		containers: filtered,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
