import { filterVisible } from '$lib/authorization';
import {
	type Container,
	type IndicatorContainer,
	type OrganizationalUnitContainer,
	payloadTypes
} from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/load/customCategoryFilters';
import type { User } from '$lib/stores';

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
	connect: <T>(fn: (connection: any) => Promise<T>) => Promise<T>;
}): Promise<IndicatorLoadResult> {
	const { organizationGuid, currentOrganizationalUnit, filters, user, connect } = params;

	// Build organizational unit scope
	let organizationalUnits: string[] = [];
	if (currentOrganizationalUnit) {
		const relatedUnits = await connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		organizationalUnits = relatedUnits
			.filter(({ payload }) => payload.level > (currentOrganizationalUnit as any).payload.level)
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

export default async function load({ depends, locals, parent, url }: any) {
	depends('containers');

	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const customCategories = extractCustomCategoryFilters(url);

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

	return {
		container: currentOrganizationalUnit ?? currentOrganization,
		containers: result.combined,
		filters,
		useNewIndicators: result.useNewIndicators
	};
}
