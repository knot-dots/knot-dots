import { filterVisible } from '$lib/authorization';
import {
	filterOrganizationalUnits,
	payloadTypes,
	computeFacetCount,
	audience,
	fromCounts,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics,
	type OrganizationContainer,
	type OrganizationalUnitContainer
} from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

type ParentData = {
	currentOrganization: OrganizationContainer;
	currentOrganizationalUnit: OrganizationalUnitContainer | null;
	defaultOrganizationGuid: string;
};

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	let subordinateOrganizationalUnits: string[] = [];
	const { currentOrganization, currentOrganizationalUnit, defaultOrganizationGuid } =
		(await parent()) as ParentData;
	const features = createFeatureDecisions(locals.features);
	const organizationScope = [currentOrganization.guid, defaultOrganizationGuid];

	const categoryContext = features.useCustomCategories()
		? await loadCategoryContext({
				connect: locals.pool.connect,
				organizationScope,
				fallbackScope: [],
				user: locals.user
			})
		: null;
	const customCategories = features.useCustomCategories()
		? extractCustomCategoryFilters(url, categoryContext?.keys ?? [])
		: {};

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	const containers = await locals.pool.connect(
		features.useElasticsearch()
			? getManyContainersWithES(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						sdg: url.searchParams.getAll('sdg'),
						customCategories,
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						template: true,
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.measure]
					},
					url.searchParams.get('sort') ?? ''
				)
			: getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						sdg: url.searchParams.getAll('sdg'),
						customCategories,
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						template: true,
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.measure]
					},
					url.searchParams.get('sort') ?? ''
				)
	);

	const filtered = filterOrganizationalUnits(
		filterVisible(containers, locals.user),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit ?? undefined
	);

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(
				filtered.map((c) => c.guid),
				categoryContext?.keys ?? []
			)
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>)
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
		containers: filtered,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
