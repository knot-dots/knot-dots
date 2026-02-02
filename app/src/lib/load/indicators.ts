import type { DatabaseConnection } from 'slonik';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	computeFacetCount,
	fromCounts,
	indicatorCategories,
	indicatorTypes,
	payloadTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics,
	type Container,
	type IndicatorContainer,
	type OrganizationContainer,
	type OrganizationalUnitContainer
} from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { createFeatureDecisions } from '$lib/features';
import { extractCustomCategoryFilters } from '$lib/load/customCategoryFilters';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import { getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import type { User } from '$lib/stores';
import type { ServerLoad } from '@sveltejs/kit';

export interface IndicatorFilters {
	customCategories: Record<string, string[]>;
	indicatorCategories: string[];
	indicatorTypes: string[];
	included: string[];
}

export interface IndicatorLoadResult {
	containers: IndicatorContainer[];
	related: Container[];
	combined: Container[]; // visible + related merged after filtering
	useNewIndicators: boolean;
}

type LoadInput = {
	depends: (deps: string) => void;
	locals: App.Locals;
	parent: () => Promise<unknown>;
	url: URL;
};

type ParentData = {
	currentOrganization: OrganizationContainer;
	currentOrganizationalUnit: OrganizationalUnitContainer | null;
};

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
	connect: <T>(fn: (connection: DatabaseConnection) => Promise<T>) => Promise<T>;
}): Promise<IndicatorLoadResult> {
	const { organizationGuid, currentOrganizationalUnit, filters, user, connect } = params;

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
	let indicators = (await connect(
		getManyContainers(
			[organizationGuid],
			{
				customCategories: filters.customCategories,
				indicatorCategories: filters.indicatorCategories,
				indicatorTypes: filters.indicatorTypes,
				...(restrictOrgUnits ? { organizationalUnits } : {}),
				type: [payloadTypes.enum.indicator]
			},
			'alpha'
		)
	)) as IndicatorContainer[];

	// Related containers (objectives/effects/indicators linked)
	let related = await connect(
		getAllContainersRelatedToIndicators(indicators, restrictOrgUnits ? { organizationalUnits } : {})
	);

	let useNewIndicators = false;

	if (indicators.length === 0) {
		useNewIndicators = true;
		const [templates, actualData] = await Promise.all([
			connect(
				getManyContainers(
					[organizationGuid],
					{
						customCategories: filters.customCategories,
						indicatorCategories: filters.indicatorCategories,
						indicatorTypes: filters.indicatorTypes,
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
		useNewIndicators
	};
}

export default (async function load({ depends, locals, parent, url }: LoadInput) {
	depends('containers');

	const { currentOrganization, currentOrganizationalUnit } = (await parent()) as ParentData;
	const customCategories = extractCustomCategoryFilters(url);
	const features = createFeatureDecisions(locals.features);

	const categoryContext = features.useCustomCategories()
		? await loadCategoryContext({
				connect: locals.pool.connect,
				organizationScope: [currentOrganization.guid],
				fallbackScope: [],
				user: locals.user
			})
		: null;

	const filters = {
		customCategories,
		indicatorCategories: url.searchParams.getAll('indicatorCategory'),
		indicatorTypes: url.searchParams.getAll('indicatorType'),
		included: url.searchParams.getAll('included')
	} as const;

	const result = await getIndicatorsData({
		organizationGuid: currentOrganization.guid,
		currentOrganizationalUnit: currentOrganizationalUnit ?? null,
		filters,
		user: locals.user,
		connect: locals.pool.connect
	});

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(
				result.combined.map((c) => c.guid),
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
		_facets.set(
			'category',
			fromCounts(sustainableDevelopmentGoals.options as string[], data?.category)
		);
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

	const facets = features.useElasticsearch()
		? _facets
		: computeFacetCount(_facets, result.combined);

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: result.combined,
		filters,
		useNewIndicators: result.useNewIndicators,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
} satisfies ServerLoad);
