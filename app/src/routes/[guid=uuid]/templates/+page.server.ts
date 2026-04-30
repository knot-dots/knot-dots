import { filterVisible } from '$lib/authorization';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
import {
	audience,
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	type PayloadType,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	templatablePayloadTypes,
	topics
} from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

const allowedTemplateTypes = new Set<PayloadType>(templatablePayloadTypes);

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	let subordinateOrganizationalUnits: string[] = [];
	const {
		categoryContext: rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit
	} = await parent();
	const features = createFeatureDecisions(locals.features);

	const requestedTypes = url.searchParams
		.getAll('type')
		.filter((value): value is PayloadType => allowedTemplateTypes.has(value as PayloadType));
	const typeFilter: PayloadType[] =
		requestedTypes.length > 0 ? requestedTypes : [...templatablePayloadTypes];

	const categoryContext = rawCategoryContext
		? filterCategoryContext(rawCategoryContext, typeFilter)
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

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	let containers;
	let data: Record<string, Record<string, number>> | undefined;
	if (features.useElasticsearch()) {
		const esResult = await getManyContainersWithES(
			currentOrganization.payload.default ? [] : [currentOrganization.guid],
			{
				...coreCategoryFilters,
				customCategories,
				template: true,
				terms: url.searchParams.get('terms') ?? '',
				type: typeFilter
			},
			url.searchParams.get('sort') ?? '',
			{ customCategoryKeys: categoryContext?.keys ?? [], includeFacets: true }
		);
		containers = esResult.containers;
		data = esResult.facets;
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					...coreCategoryFilters,
					customCategories,
					template: true,
					terms: url.searchParams.get('terms') ?? '',
					type: typeFilter
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	const filtered = filterOrganizationalUnits(
		filterVisible(containers, locals.user),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit ?? undefined
	);

	const _facets = new Map<string, Map<string, number>>([
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>)
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

	_facets.set('type', fromCounts([...templatablePayloadTypes] as string[], data?.type));

	const facets = features.useElasticsearch()
		? _facets
		: computeFacetCount(_facets, containers, { useCategoryPayload: useCustomCategories });

	return {
		containers: filtered,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
