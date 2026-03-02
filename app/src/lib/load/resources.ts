import { filterVisible } from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	payloadTypes,
	resourceCategories,
	resourceUnits,
	type ResourceV2Container
} from '$lib/models';
import { buildCategoryFacetsWithCounts } from '$lib/server/categoryOptions';
import { getManyContainers } from '$lib/server/db';
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
					{ customCategoryKeys: categoryContext?.keys ?? [] }
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
