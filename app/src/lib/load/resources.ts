import { filterVisible } from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	payloadTypes,
	predicates,
	resourceCategories,
	resourceUnits,
	type ResourceDataContainer,
	type ResourceV2Container
} from '$lib/models';
import { buildCategoryFacetsWithCounts } from '$lib/server/categoryOptions';
import { getAllContainersRelatedToProgram, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from '../../routes/[guid=uuid]/resources/$types';

export default function load(defaultSort: 'alpha' | 'modified' | 'priority') {
	return (async ({ depends, locals, parent, url }) => {
		depends('containers');

		const { categoryContext, currentOrganization, currentOrganizationalUnit } = await parent();
		const features = createFeatureDecisions(locals.features);

		const customCategories = features.useCustomCategories()
			? extractCustomCategoryFilters(url, categoryContext?.keys ?? [])
			: {};

		const scope = currentOrganization.payload.default ? [] : [currentOrganization.guid];

		let resourceContainers: ResourceV2Container[];
		let data: Record<string, Record<string, number>> | undefined;
		if (features.useElasticsearch()) {
			const esResult = await locals.pool.connect(
				getManyContainersWithES(
					scope,
					{
						customCategories,
						resourceCategories: url.searchParams.getAll('resourceCategory'),
						type: [payloadTypes.enum.resource_v2]
					},
					url.searchParams.get('sort') ?? defaultSort,
					undefined,
					{ customCategoryKeys: categoryContext?.keys ?? [], includeFacets: true }
				)
			);
			resourceContainers = esResult.containers as ResourceV2Container[];
			data = esResult.facets;
		} else {
			resourceContainers = (await locals.pool.connect(
				getManyContainers(
					scope,
					{
						customCategories,
						resourceCategories: url.searchParams.getAll('resourceCategory'),
						type: [payloadTypes.enum.resource_v2]
					},
					url.searchParams.get('sort') ?? defaultSort
				)
			)) as ResourceV2Container[];
		}

		// Filter by program if specified
		let filteredResourceContainers = resourceContainers;

		if (url.searchParams.has('program')) {
			const programGuid = url.searchParams.get('program') as string;

			// Get all containers related to the program (goals, measures, etc.)
			const relatedContainers = await locals.pool.connect(
				getAllContainersRelatedToProgram(programGuid, {
					type: [
						payloadTypes.enum.goal,
						payloadTypes.enum.measure,
						payloadTypes.enum.simple_measure
					]
				})
			);

			// Get all resource_data containers linked to those goals/measures
			const resourceDataContainers = (await locals.pool.connect(
				getManyContainers(
					scope,
					{
						type: [payloadTypes.enum.resource_data]
						// Resource data links to goals/measures via their guid
					},
					'alpha'
				)
			)) as ResourceDataContainer[];

			// Filter resource_data to only those that are part of related containers
			const relatedGuids = new Set(relatedContainers.map((c) => c.guid));
			const usedResourceData = resourceDataContainers.filter((rd) =>
				rd.relation.some(
					(r) => r.predicate === predicates.enum['is-part-of'] && relatedGuids.has(r.object)
				)
			);

			// Extract unique resource GUIDs
			const usedResourceGuids = new Set(
				usedResourceData.map((rd) => rd.payload.resource).filter(Boolean)
			);

			// Filter to only resources that are actually used
			filteredResourceContainers = resourceContainers.filter((r) => usedResourceGuids.has(r.guid));
		}

		const containers = filterOrganizationalUnits(
			filterVisible(filteredResourceContainers, locals.user),
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
				fromCounts(resourceCategories.options as string[], data?.resourceCategory)
			],
			['resourceUnit', fromCounts(resourceUnits.options as string[], data?.resourceUnit)]
		]);

		if (features.useCustomCategories() && categoryContext) {
			const customFacets = buildCategoryFacetsWithCounts(
				categoryContext.options,
				data ? Object.fromEntries(Object.entries(data)) : {}
			);
			for (const [key, values] of customFacets.entries()) {
				_facets.set(key, values);
			}
		}

		const facets = features.useElasticsearch()
			? _facets
			: computeFacetCount(_facets, containers, {
					useCategoryPayload: features.useCustomCategories()
				});

		return {
			containers,
			facets,
			facetLabels: categoryContext?.labels,
			categoryOptions: categoryContext?.options ?? null
		};
	}) satisfies PageServerLoad;
}
