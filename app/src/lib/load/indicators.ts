import type { DatabaseConnection } from 'slonik';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	computeFacetCount,
	type Container,
	fromCounts,
	indicatorCategories,
	type IndicatorContainer,
	indicatorTypes,
	type OrganizationalUnitContainer,
	payloadTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { createFeatureDecisions } from '$lib/features';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/server/categoryOptions';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import type { User } from '$lib/stores';
import type { PageServerLoad } from '../../routes/[guid=uuid]/indicators/$types';

export interface IndicatorFilters {
	customCategories: Record<string, string[]>;
	indicatorCategories: string[];
	indicatorTypes: string[];
	included: string[];
	sdg: string[];
}

export interface IndicatorLoadResult {
	containers: IndicatorContainer[];
	related: Container[];
	combined: Container[]; // visible + related merged after filtering
	facetData?: Record<string, Record<string, number>>;
	useNewIndicators: boolean;
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

	const restrictOrgUnits = !filters.included.includes('all_organizational_units');

	// Primary indicator fetch
	let indicators: IndicatorContainer[] = [];
	let facetData: Record<string, Record<string, number>> | undefined;
	if (useElasticsearch) {
		const esResult = await connect(
			getManyContainersWithES(
				[organizationGuid],
				{
					customCategories: filters.customCategories,
					indicatorCategories: filters.indicatorCategories,
					indicatorTypes: filters.indicatorTypes,
					sdg: filters.sdg,
					...(restrictOrgUnits ? { organizationalUnits } : {}),
					type: [payloadTypes.enum.indicator]
				},
				'alpha',
				undefined,
				{ customCategoryKeys: customCategoryKeys ?? [], includeFacets: true }
			)
		);
		indicators = esResult.containers as IndicatorContainer[];
		facetData = esResult.facets;
	} else {
		indicators = (await connect(
			getManyContainers(
				[organizationGuid],
				{
					customCategories: filters.customCategories,
					indicatorCategories: filters.indicatorCategories,
					indicatorTypes: filters.indicatorTypes,
					sdg: filters.sdg,
					...(restrictOrgUnits ? { organizationalUnits } : {}),
					type: [payloadTypes.enum.indicator]
				},
				'alpha'
			)
		)) as IndicatorContainer[];
	}

	// Related containers (objectives/effects/indicators linked)
	let related = await connect(
		getAllContainersRelatedToIndicators(indicators, restrictOrgUnits ? { organizationalUnits } : {})
	);

	let useNewIndicators = false;

	if (indicators.length === 0) {
		useNewIndicators = true;
		facetData = undefined;
		const [templates, actualData] = await Promise.all([
			connect(
				getManyContainers(
					[],
					{
						customCategories: filters.customCategories,
						indicatorCategories: filters.indicatorCategories,
						indicatorTypes: filters.indicatorTypes,
						sdg: filters.sdg,
						type: [payloadTypes.enum.indicator_template]
					},
					'alpha'
				)
			),
			connect(
				getManyContainers(
					[organizationGuid],
					{
						organizationalUnits: currentOrganizationalUnit ? [currentOrganizationalUnit.guid] : [],
						type: [payloadTypes.enum.actual_data]
					},
					'alpha'
				)
			)
		]);
		indicators = templates as IndicatorContainer[];
		related = actualData;
	}

	const combinedVisible = filterVisible([...indicators, ...related], user);

	return {
		containers: indicators,
		related,
		combined: combinedVisible,
		facetData,
		useNewIndicators
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
		? filterCategoryContext(rawCategoryContext, [
				payloadTypes.enum.indicator,
				payloadTypes.enum.indicator_template
			])
		: null;

	const customCategories = features.useCustomCategories()
		? extractCustomCategoryFilters(url, categoryContext?.keys ?? [])
		: {};

	const filters = {
		customCategories,
		indicatorCategories: url.searchParams.getAll('indicatorCategory'),
		indicatorTypes: url.searchParams.getAll('indicatorType'),
		included: url.searchParams.getAll('included'),
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

	const useFacetData = features.useElasticsearch() && !result.useNewIndicators;
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
		: computeFacetCount(_facets, result.combined, {
				useCategoryPayload: features.useCustomCategories()
			});

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: result.combined,
		filters,
		useNewIndicators: result.useNewIndicators,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
} satisfies PageServerLoad);
