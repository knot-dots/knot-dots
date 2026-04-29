import type { DatabaseConnection } from 'slonik';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	computeFacetCount,
	type Container,
	fromCounts,
	indicatorCategories,
	type IndicatorTemplateContainer,
	indicatorTypes,
	type OrganizationalUnitContainer,
	payloadTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import {
	getAllContainersRelatedToIndicatorTemplates,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import type { User } from '$lib/stores';
import type { PageServerLoad } from '../../routes/[guid=uuid]/indicators/$types';

export interface IndicatorFilters {
	customCategories: Record<string, string[]>;
	indicatorCategories: string[];
	indicatorTypes: string[];
	included: string[];
	terms: string;
	sdg: string[];
}

export interface IndicatorLoadResult {
	containers: IndicatorTemplateContainer[];
	related: Container[];
	combined: Container[]; // visible + related merged after filtering
	facetData?: Record<string, Record<string, number>>;
}

/**
 * Fetch indicators for an organization/org unit with fallback to templates + actual data when none exist.
 * Applies org-unit scoping unless 'all_organizational_units' is included. Returns merged visible containers
 * and a flag indicating template usage. Facets are computed over the final visible set.
 */
export async function getIndicatorsData(params: {
	organizationGuid: string;
	currentOrganizationalUnit: OrganizationalUnitContainer | null;
	filters: IndicatorFilters;
	user: User;
	useElasticsearch?: boolean;
	customCategoryKeys?: string[];
	connect: <T>(fn: (connection: DatabaseConnection) => Promise<T>) => Promise<T>;
}): Promise<IndicatorLoadResult> {
	const {
		organizationGuid,
		currentOrganizationalUnit,
		filters,
		user,
		useElasticsearch,
		customCategoryKeys,
		connect
	} = params;

	// Build organizational unit scope
	let organizationalUnits: string[] = [];
	if (currentOrganizationalUnit) {
		const relatedUnits = await connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		organizationalUnits = relatedUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid)
			.concat(currentOrganizationalUnit.guid);
	}

	let indicators: IndicatorTemplateContainer[];
	let facetData: Record<string, Record<string, number>> | undefined;

	if (useElasticsearch) {
		const esResult = await getManyContainersWithES(
			[],
			{
				customCategories: filters.customCategories,
				indicatorCategories: filters.indicatorCategories,
				indicatorTypes: filters.indicatorTypes,
				sdg: filters.sdg,
				terms: filters.terms,
				type: [payloadTypes.enum.indicator_template]
			},
			'alpha',
			{ customCategoryKeys: customCategoryKeys ?? [], includeFacets: true }
		);
		indicators = esResult.containers as IndicatorTemplateContainer[];
		facetData = esResult.facets;
	} else {
		indicators = (await connect(
			getManyContainers(
				[],
				{
					customCategories: filters.customCategories,
					indicatorCategories: filters.indicatorCategories,
					indicatorTypes: filters.indicatorTypes,
					sdg: filters.sdg,
					terms: filters.terms,
					type: [payloadTypes.enum.indicator_template, payloadTypes.enum.binary_indicator]
				},
				'alpha'
			)
		)) as IndicatorTemplateContainer[];
		facetData = undefined;
	}

	const related = await connect(
		getAllContainersRelatedToIndicatorTemplates(
			indicators,
			{
				organizations: [organizationGuid],
				organizationalUnits: !filters.included.includes('all_organizational_units')
					? organizationalUnits
					: []
			},
			{
				organizations: [organizationGuid],
				organizationalUnits: currentOrganizationalUnit ? [currentOrganizationalUnit.guid] : null
			}
		)
	);

	const combinedVisible = filterVisible([...indicators, ...related], user);

	return {
		containers: indicators,
		related,
		combined: combinedVisible,
		facetData
	};
}

export default (async function load({ depends, locals, parent, url }) {
	depends('containers');

	const {
		categoryContext: rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit
	} = await parent();
	const features = createFeatureDecisions(locals.features);
	const categoryContext = rawCategoryContext
		? filterCategoryContext(rawCategoryContext, [payloadTypes.enum.indicator_template])
		: null;

	const customCategories = features.useCustomCategories()
		? extractCustomCategoryFilters(url, categoryContext?.keys ?? [])
		: {};

	const filters = {
		customCategories,
		indicatorCategories: url.searchParams.getAll('indicatorCategory'),
		indicatorTypes: url.searchParams.getAll('indicatorType'),
		included: url.searchParams.getAll('included'),
		terms: url.searchParams.get('terms') ?? '',
		sdg: url.searchParams.getAll('sdg')
	} as const;

	const result = await getIndicatorsData({
		organizationGuid: currentOrganization.guid,
		currentOrganizationalUnit: currentOrganizationalUnit ?? null,
		filters,
		user: locals.user,
		useElasticsearch: features.useElasticsearch(),
		customCategoryKeys: categoryContext?.keys ?? [],
		connect: locals.pool.connect
	});

	const useFacetData = features.useElasticsearch();
	const data = useFacetData ? result.facetData : undefined;

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

	_facets.set('indicatorType', fromCounts(indicatorTypes.options as string[], data?.indicatorType));
	_facets.set(
		'indicatorCategory',
		fromCounts(indicatorCategories.options as string[], data?.indicatorCategory)
	);
	const facets = useFacetData
		? _facets
		: computeFacetCount(_facets, result.containers, {
				useCategoryPayload: features.useCustomCategories()
			});

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: result.combined,
		filters,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options
	};
} satisfies PageServerLoad);
