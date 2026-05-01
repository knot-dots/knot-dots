import { filterVisible } from '$lib/authorization';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
import {
	type AnyContainer,
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	payloadTypes,
	predicates,
	programTypes
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	let containers: AnyContainer[];
	let data: Record<string, Record<string, number>> | undefined;
	const {
		categoryContext: rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit
	} = await parent();
	const features = createFeatureDecisions(locals.features);
	const categoryContext = rawCategoryContext
		? filterCategoryContext(rawCategoryContext, [payloadTypes.enum.program])
		: null;
	const customCategories = extractCustomCategoryFilters(url, categoryContext?.keys ?? []);

	async function filterOrganizationalUnitsAsync<T extends AnyContainer>(
		promise: Promise<Array<T>>
	) {
		let subordinateOrganizationalUnits: string[] = [];

		const nextContainers = await promise;

		if (currentOrganizationalUnit) {
			const relatedOrganizationalUnits = await locals.pool.connect(
				getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
			);
			subordinateOrganizationalUnits = relatedOrganizationalUnits
				.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
				.map(({ guid }) => guid);
		}

		return [
			...nextContainers.filter(({ organization }) => organization != currentOrganization.guid),
			...filterOrganizationalUnits(
				nextContainers.filter(({ organization }) => organization == currentOrganization.guid),
				url,
				subordinateOrganizationalUnits,
				currentOrganizationalUnit ?? undefined
			)
		];
	}

	if (url.searchParams.has('related-to')) {
		containers = await filterOrganizationalUnitsAsync(
			locals.pool.connect(
				getAllRelatedContainers(
					[],
					url.searchParams.get('related-to') as string,
					url.searchParams.getAll('relationType').length === 0
						? [
								predicates.enum['is-consistent-with'],
								predicates.enum['is-equivalent-to'],
								predicates.enum['is-inconsistent-with'],
								predicates.enum['is-superordinate-of']
							]
						: url.searchParams.getAll('relationType'),
					{ customCategories },
					url.searchParams.get('sort') ?? ''
				)
			)
		);
		containers = filterVisible(containers, locals.user);
	} else {
		if (features.useElasticsearch()) {
			const esResult = await getManyContainersWithES(
				[],
				{
					customCategories,
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.program]
				},
				url.searchParams.get('sort') ?? '',
				{ customCategoryKeys: categoryContext?.keys ?? [], includeFacets: true }
			);
			containers = await filterOrganizationalUnitsAsync(Promise.resolve(esResult.containers));
			data = esResult.facets;
		} else {
			containers = await filterOrganizationalUnitsAsync(
				locals.pool.connect(
					getManyContainers(
						[],
						{
							customCategories,
							programTypes: url.searchParams.getAll('programType'),
							terms: url.searchParams.get('terms') ?? '',
							type: [payloadTypes.enum.program]
						},
						url.searchParams.get('sort') ?? ''
					)
				)
			);
		}
		containers = filterVisible(containers, locals.user);
	}

	const _facets = new Map<string, Map<string, number>>([
		...((url.searchParams.has('related-to')
			? [
					[
						'relationType',
						new Map([
							[predicates.enum['is-consistent-with'], 0],
							[predicates.enum['is-equivalent-to'], 0],
							[predicates.enum['is-inconsistent-with'], 0],
							[predicates.enum['is-superordinate-of'], 0]
						])
					]
				]
			: []) as Array<[string, Map<string, number>]>),
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

	_facets.set('programType', fromCounts(programTypes.options as string[], data?.programType));

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

	return {
		containers,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
};
