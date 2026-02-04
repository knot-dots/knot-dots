import { filterVisible } from '$lib/authorization';
import {
	type Container,
	filterOrganizationalUnits,
	payloadTypes,
	predicates,
	computeFacetCount,
	audience,
	fromCounts,
	policyFieldBNK,
	programTypes,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers: Container[];
	const customCategories = extractCustomCategoryFilters(url);
	const { currentOrganization, currentOrganizationalUnit, defaultOrganizationGuid } =
		await parent();
	const features = createFeatureDecisions(locals.features);

	const organizationScope = Array.from(
		new Set(
			[currentOrganization.guid, defaultOrganizationGuid].filter((guid): guid is string =>
				Boolean(guid)
			)
		)
	);

	const categoryContext = features.useCustomCategories()
		? await loadCategoryContext({
				connect: locals.pool.connect,
				organizationScope,
				fallbackScope: [],
				user: locals.user,
				objectTypes: [payloadTypes.enum.program]
			})
		: null;

	async function filterOrganizationalUnitsAsync<T extends Container>(promise: Promise<Array<T>>) {
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
				currentOrganizationalUnit
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
		containers = await filterOrganizationalUnitsAsync(
			locals.pool.connect(
				features.useElasticsearch()
					? getManyContainersWithES(
							[],
							{
								audience: url.searchParams.getAll('audience'),
								categories: url.searchParams.getAll('category'),
								customCategories,
								policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
								programTypes: url.searchParams.getAll('programType'),
								terms: url.searchParams.get('terms') ?? '',
								topics: url.searchParams.getAll('topic'),
								type: [payloadTypes.enum.program]
							},
							url.searchParams.get('sort') ?? ''
						)
					: getManyContainers(
							[],
							{
								audience: url.searchParams.getAll('audience'),
								categories: url.searchParams.getAll('category'),
								customCategories,
								policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
								programTypes: url.searchParams.getAll('programType'),
								terms: url.searchParams.get('terms') ?? '',
								topics: url.searchParams.getAll('topic'),
								type: [payloadTypes.enum.program]
							},
							url.searchParams.get('sort') ?? ''
						)
			)
		);
		containers = filterVisible(containers, locals.user);
	}

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(
				containers.map((c) => c.guid),
				categoryContext?.keys ?? []
			)
		: undefined;

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

	_facets.set('programType', fromCounts(programTypes.options as string[], data?.programType));

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

	return {
		containers,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
