import { filterVisible } from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	buildCategoryFacetsWithCounts,
	type CategoryContext,
	filterCategoryContext
} from '$lib/categoryOptions';
import {
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	isResourceDataContainer,
	payloadTypes,
	resourceCategories,
	resourceUnits,
	type ResourceV2Container
} from '$lib/models';
import { getAllContainersRelatedToProgram, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { DatabasePool } from 'slonik';
import type { PageServerLoad } from '../../routes/[guid=uuid]/resources/$types';

/**
 * Fetches and filters resource containers, optionally by program
 */
export async function fetchResources({
	pool,
	scope,
	programGuid,
	features,
	customCategories,
	resourceCategoryFilters,
	sort,
	categoryContext
}: {
	pool: DatabasePool;
	scope: string[];
	programGuid?: string;
	features: ReturnType<typeof createFeatureDecisions>;
	customCategories: Record<string, string[]>;
	resourceCategoryFilters: string[];
	sort: 'alpha' | 'modified' | 'priority';
	categoryContext: CategoryContext;
}) {
	// Fetch all resource containers
	let resourceContainers: ResourceV2Container[];
	let data: Record<string, Record<string, number>> | undefined;

	if (features.useElasticsearch()) {
		const esResult = await getManyContainersWithES(
			scope,
			{
				customCategories,
				resourceCategories: resourceCategoryFilters,
				type: [payloadTypes.enum.resource_v2]
			},
			sort,
			{ customCategoryKeys: categoryContext.keys, includeFacets: true }
		);
		resourceContainers = esResult.containers as ResourceV2Container[];
		data = esResult.facets;
	} else {
		resourceContainers = (await pool.connect(
			getManyContainers(
				scope,
				{
					customCategories,
					resourceCategories: resourceCategoryFilters,
					type: [payloadTypes.enum.resource_v2]
				},
				sort
			)
		)) as ResourceV2Container[];
	}

	// Filter by program if specified
	if (programGuid) {
		// Get all containers related to the program (goals, measures, etc.)
		const relatedContainers = await pool.connect(
			getAllContainersRelatedToProgram(programGuid, {
				type: [
					payloadTypes.enum.goal,
					payloadTypes.enum.measure,
					payloadTypes.enum.simple_measure,
					payloadTypes.enum.resource_data
				]
			})
		);

		// Extract unique resource GUIDs from resource_data containers
		const usedResourceGuids = new Set(
			relatedContainers.filter(isResourceDataContainer).map((c) => c.payload.resource)
		);

		// Filter to only resources that are actually used
		resourceContainers = resourceContainers.filter((r) => usedResourceGuids.has(r.guid));
	}

	return { resourceContainers, facetData: data };
}

export default function load(defaultSort: 'alpha' | 'modified' | 'priority') {
	return (async ({ depends, locals, parent, url }) => {
		depends('containers');

		const {
			categoryContext: rawCategoryContext,
			currentOrganization,
			currentOrganizationalUnit
		} = await parent();
		const features = createFeatureDecisions(locals.features);
		const categoryContext = rawCategoryContext;
		filterCategoryContext(rawCategoryContext, [payloadTypes.enum.resource_v2]);

		const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);
		const scope = currentOrganization.payload.default ? [] : [currentOrganization.guid];
		const programGuid = url.searchParams.get('program') ?? undefined;

		const { resourceContainers, facetData } = await fetchResources({
			pool: locals.pool,
			scope,
			programGuid,
			features,
			customCategories,
			resourceCategoryFilters: url.searchParams.getAll('resourceCategory'),
			sort: (url.searchParams.get('sort') ?? defaultSort) as 'alpha' | 'modified' | 'priority',
			categoryContext
		});

		const containers = filterOrganizationalUnits(
			filterVisible(resourceContainers, locals.user),
			url,
			[],
			currentOrganizationalUnit ?? undefined
		);

		const _facets = new Map<string, Map<string, number>>([
			...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
				[string, Map<string, number>]
			>),
			[
				'resourceCategory',
				fromCounts(resourceCategories.options as string[], facetData?.resourceCategory)
			],
			['resourceUnit', fromCounts(resourceUnits.options as string[], facetData?.resourceUnit)]
		]);

		if (categoryContext) {
			const customFacets = buildCategoryFacetsWithCounts(
				categoryContext.options,
				facetData ? Object.fromEntries(Object.entries(facetData)) : {}
			);
			for (const [key, values] of customFacets.entries()) {
				_facets.set(key, values);
			}
		}

		const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

		return {
			containers,
			facets
		};
	}) satisfies PageServerLoad;
}
