import type { DatabasePool } from 'slonik';
import { filterVisible } from '$lib/authorization';
import {
	buildCategoryFacetsWithCounts,
	filterCategoryContext,
	type CategoryContext
} from '$lib/categoryOptions';
import {
	type Container,
	filterOrganizationalUnits,
	fromCounts,
	type OrganizationalUnitPayload,
	type OrganizationPayload,
	type PayloadType,
	templatablePayloadTypes
} from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers } from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import type { User } from '$lib/stores';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';

const allowedTemplateTypes = new Set<PayloadType>(templatablePayloadTypes);

export async function fetchTemplates({
	pool,
	user,
	url,
	rawCategoryContext,
	currentOrganization,
	currentOrganizationalUnit,
	availableIn
}: {
	pool: DatabasePool;
	user: User;
	url: URL;
	rawCategoryContext: CategoryContext;
	currentOrganization: Container<OrganizationPayload>;
	currentOrganizationalUnit: Container<OrganizationalUnitPayload> | null | undefined;
	availableIn?: string;
}) {
	let subordinateOrganizationalUnits: string[] = [];

	const requestedTypes = url.searchParams
		.getAll('type')
		.filter((value): value is PayloadType => allowedTemplateTypes.has(value as PayloadType));
	const typeFilter: PayloadType[] =
		requestedTypes.length > 0 ? requestedTypes : [...templatablePayloadTypes];

	const categoryContext = filterCategoryContext(rawCategoryContext, typeFilter);
	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	const esResult = await getManyContainersWithES(
		currentOrganization.payload.default ? [] : [currentOrganization.guid],
		{
			availableIn,
			customCategories,
			template: true,
			templateRoot: true,
			terms: url.searchParams.get('terms') ?? '',
			type: typeFilter
		},
		url.searchParams.get('sort') ?? '',
		{ customCategoryKeys: categoryContext.keys, includeFacets: true }
	);
	const data = esResult.facets;

	const containers = filterOrganizationalUnits(
		filterVisible(esResult.containers, user),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit ?? undefined
	);

	const facets = new Map<string, Map<string, number>>([
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>)
	]);

	const customFacets = buildCategoryFacetsWithCounts(
		categoryContext.options,
		data ? Object.fromEntries(Object.entries(data)) : {}
	);
	for (const [key, values] of customFacets.entries()) {
		facets.set(key, values);
	}

	facets.set('type', fromCounts([...templatablePayloadTypes] as string[], data?.type));

	return { containers, facets };
}
