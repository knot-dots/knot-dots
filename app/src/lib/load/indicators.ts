import type { DatabaseConnection } from 'slonik';
import { filterVisible } from '$lib/authorization';
import {
	type Container,
	type IndicatorContainer,
	type OrganizationalUnitContainer,
	payloadTypes,
	computeFacetCount,
	audience,
	fromCounts,
	indicatorCategories,
	indicatorTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import type { User } from '$lib/stores';
import type { PageServerLoad } from '../../routes/[[guid=uuid]]/indicators/$types';

export interface IndicatorFilters {
	audience: string[];
	categories: string[];
	indicatorCategories: string[];
	indicatorTypes: string[];
	policyFieldsBNK: string[];
	topics: string[];
	included: string[];
}

export interface IndicatorLoadResult {
	containers: IndicatorContainer[];
	related: Container[];
	combined: Container[]; // visible + related merged after filtering
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
				audience: filters.audience,
				categories: filters.categories,
				indicatorCategories: filters.indicatorCategories,
				indicatorTypes: filters.indicatorTypes,
				...(restrictOrgUnits ? { organizationalUnits } : {}),
				policyFieldsBNK: filters.policyFieldsBNK,
				topics: filters.topics,
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
						audience: filters.audience,
						categories: filters.categories,
						indicatorCategories: filters.indicatorCategories,
						indicatorTypes: filters.indicatorTypes,
						policyFieldsBNK: filters.policyFieldsBNK,
						topics: filters.topics,
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

export default (async function load({ depends, locals, parent, url }) {
	depends('containers');

	const { currentOrganization, currentOrganizationalUnit } = await parent();

	const filters = {
		audience: url.searchParams.getAll('audience'),
		categories: url.searchParams.getAll('category'),
		indicatorCategories: url.searchParams.getAll('indicatorCategory'),
		indicatorTypes: url.searchParams.getAll('indicatorType'),
		policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
		topics: url.searchParams.getAll('topic'),
		included: url.searchParams.getAll('included')
	} as const;

	const result = await getIndicatorsData({
		organizationGuid: currentOrganization.guid,
		currentOrganizationalUnit: currentOrganizationalUnit ?? null,
		filters,
		user: locals.user,
		connect: locals.pool.connect
	});

	const features = createFeatureDecisions(locals.features);
	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(result.combined.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>),
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

	const facets = features.useElasticsearch()
		? _facets
		: computeFacetCount(_facets, result.combined);

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: result.combined,
		filters,
		useNewIndicators: result.useNewIndicators,
		facets
	};
} satisfies PageServerLoad);
