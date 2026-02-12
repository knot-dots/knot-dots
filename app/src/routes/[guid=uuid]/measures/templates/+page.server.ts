import { filterVisible } from '$lib/authorization';
import {
	filterOrganizationalUnits,
	payloadTypes,
	computeFacetCount,
	audience,
	measureTypes,
	fromCounts,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import type { CategoryOptions } from '$lib/categoryOptions';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	let subordinateOrganizationalUnits: string[] = [];
	const customCategories = extractCustomCategoryFilters(url);
	const { currentOrganization, currentOrganizationalUnit, defaultOrganizationGuid } =
		await parent();
	const features = createFeatureDecisions(locals.features);

	const mapFacetKey = (key: string) => (key === 'policy_field_bnk' ? 'policyFieldBNK' : key);
	const mapFacets = (facets: Map<string, Map<string, number>>) => {
		const mapped = new Map<string, Map<string, number>>();
		for (const [key, values] of facets) {
			mapped.set(mapFacetKey(key), values);
		}
		return mapped;
	};
	const mapLabels = (labels?: Map<string, string>) => {
		if (!labels) return undefined;
		const mapped = new Map<string, string>();
		for (const [key, label] of labels) {
			mapped.set(mapFacetKey(key), label);
		}
		return mapped;
	};
	const mapOptions = (options?: CategoryOptions | null) => {
		if (!options) return null;
		const mappedOptions: CategoryOptions = {};
		for (const [key, value] of Object.entries(options)) {
			if (key === '__categoryLabels__') continue;
			if (!Array.isArray(value)) continue;
			mappedOptions[mapFacetKey(key)] = value;
		}
		const labelEntries = Object.entries(options.__categoryLabels__ ?? {}).map(([k, v]) => [
			mapFacetKey(k),
			v
		]);
		if (labelEntries.length) {
			mappedOptions.__categoryLabels__ = Object.fromEntries(labelEntries);
		}
		return mappedOptions;
	};

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
				objectTypes: [payloadTypes.enum.measure]
			})
		: null;

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
		currentOrganizationalUnit
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

	_facets.set('measureType', fromCounts(measureTypes.options as string[], data?.measureType));

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, filtered);

	return {
		containers: filtered,
		facets: mapFacets(facets),
		facetLabels: mapLabels(categoryContext?.labels),
		categoryOptions: mapOptions(categoryContext?.options ?? null)
	};
}) satisfies PageServerLoad;
