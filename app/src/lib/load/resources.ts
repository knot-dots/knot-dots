import { filterVisible } from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	payloadTypes,
	resourceCategories,
	resourceUnits,
	type OrganizationContainer,
	type OrganizationalUnitContainer,
	type ResourceV2Container
} from '$lib/models';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import { getManyContainers } from '$lib/server/db';
import { getFacetAggregationsForGuids, getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { ServerLoad } from '@sveltejs/kit';

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

export default function load(defaultSort: 'alpha' | 'modified' | 'priority') {
	return (async ({ depends, locals, parent, url }: LoadInput) => {
		depends('containers');

		const { currentOrganization, currentOrganizationalUnit } = (await parent()) as ParentData;
		const features = createFeatureDecisions(locals.features);
		const customCategories = extractCustomCategoryFilters(url);
		const categoryContext = features.useCustomCategories()
			? await loadCategoryContext({
					connect: locals.pool.connect,
					organizationScope: [currentOrganization.guid],
					fallbackScope: [],
					user: locals.user
				})
			: null;

		const scope = currentOrganization.payload.default ? [] : [currentOrganization.guid];

		const resourceContainers = (await locals.pool.connect(
			features.useElasticsearch()
				? getManyContainersWithES(
						scope,
						{
							customCategories,
							resourceCategories: url.searchParams.getAll('resourceCategory'),
							type: [payloadTypes.enum.resource_v2]
						},
						url.searchParams.get('sort') ?? defaultSort
					)
				: getManyContainers(
						scope,
						{
							customCategories,
							resourceCategories: url.searchParams.getAll('resourceCategory'),
							type: [payloadTypes.enum.resource_v2]
						},
						url.searchParams.get('sort') ?? defaultSort
					)
		)) as ResourceV2Container[];

		const containers = filterOrganizationalUnits(
			filterVisible(resourceContainers, locals.user),
			url,
			[],
			currentOrganizationalUnit ?? undefined
		);

		const data = features.useElasticsearch()
			? await getFacetAggregationsForGuids(
					containers.map((c) => c.guid),
					categoryContext?.keys ?? []
				)
			: undefined;

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

		const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

		return {
			containers,
			facets,
			facetLabels: categoryContext?.labels,
			categoryOptions: categoryContext?.options ?? null
		};
	}) satisfies ServerLoad;
}
