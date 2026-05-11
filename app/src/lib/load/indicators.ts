import type { DatabaseConnection } from 'slonik';
import { filterVisible } from '$lib/authorization';
import {
	type Container,
	fromCounts,
	indicatorCategories,
	type IndicatorTemplateContainer,
	indicatorTypes,
	isActualDataContainer,
	type OrganizationalUnitContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	getAllContainersRelatedToIndicatorTemplates,
	getAllRelatedOrganizationalUnitContainers
} from '$lib/server/db';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
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
	customCategoryKeys: string[];
	connect: <T>(fn: (connection: DatabaseConnection) => Promise<T>) => Promise<T>;
}): Promise<IndicatorLoadResult> {
	const {
		organizationGuid,
		currentOrganizationalUnit,
		filters,
		user,
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

	const esResult = await getManyContainersWithES(
		[],
		{
			customCategories: filters.customCategories,
			indicatorCategories: filters.indicatorCategories,
			indicatorTypes: filters.indicatorTypes,
			terms: filters.terms,
			type: [payloadTypes.enum.indicator_template]
		},
		'alpha',
		{ customCategoryKeys: customCategoryKeys, includeFacets: true }
	);
	const indicators = esResult.containers as IndicatorTemplateContainer[];
	const facetData = esResult.facets;

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

	const containers = indicators.filter(
		(c) =>
			related.filter(isActualDataContainer).some(({ payload }) => payload.indicator === c.guid) ||
			related.some(
				({ guid, relation }) =>
					relation.some(
						({ object, predicate }) =>
							object === c.guid &&
							(predicate === predicates.enum['is-measured-by'] ||
								predicate === predicates.enum['is-objective-for'])
					) && guid !== c.guid
			)
	);

	const combinedVisible = filterVisible([...containers, ...related], user);

	return {
		containers,
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
	const categoryContext = filterCategoryContext(rawCategoryContext, [
		payloadTypes.enum.indicator_template
	]);
	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);
	const filters = {
		customCategories,
		indicatorCategories: url.searchParams.getAll('indicatorCategory'),
		indicatorTypes: url.searchParams.getAll('indicatorType'),
		included: url.searchParams.getAll('included'),
		terms: url.searchParams.get('terms') ?? ''
	} as const;

	const result = await getIndicatorsData({
		organizationGuid: currentOrganization.guid,
		currentOrganizationalUnit: currentOrganizationalUnit ?? null,
		filters,
		user: locals.user,
		customCategoryKeys: categoryContext.keys,
		connect: locals.pool.connect
	});

	const data = result.facetData;

	const _facets = new Map<string, Map<string, number>>([
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>)
	]);

	if (categoryContext) {
		const customFacets = buildCategoryFacetsWithCounts(
			categoryContext.options,
			data ? Object.fromEntries(Object.entries(data)) : {}
		);
		for (const [key, values] of customFacets.entries()) {
			_facets.set(key, values);
		}
	}

	_facets.set('indicatorType', fromCounts(indicatorTypes.options as string[], data?.indicatorType));
	_facets.set(
		'indicatorCategory',
		fromCounts(indicatorCategories.options as string[], data?.indicatorCategory)
	);
	const facets = _facets;

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: result.combined,
		filters,
		facets
	};
} satisfies PageServerLoad);
