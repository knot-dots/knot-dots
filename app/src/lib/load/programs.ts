import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	payloadTypes,
	policyFieldBNK,
	predicates,
	programTypes,
	sustainableDevelopmentGoals,
	topics,
	type Container,
	type OrganizationContainer,
	type OrganizationalUnitContainer
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getFacetAggregationsForGuids, getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
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
	defaultOrganizationGuid: string | null;
};

export default (async function load({ depends, locals, parent, url }: LoadInput) {
	depends('containers');

	let containers: Container[];
	let subordinateOrganizationalUnits: string[] = [];
	const customCategories = extractCustomCategoryFilters(url);
	const { currentOrganization, currentOrganizationalUnit, defaultOrganizationGuid } =
		(await parent()) as ParentData;
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

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relationType').length == 0
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
		);
	} else {
		containers = await locals.pool.connect(
			features.useElasticsearch()
				? getManyContainersWithES(
						currentOrganization.payload.default ? [] : [currentOrganization.guid],
						{
							audience: url.searchParams.getAll('audience'),
							sdg: url.searchParams.getAll('sdg'),
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
						currentOrganization.payload.default ? [] : [currentOrganization.guid],
						{
							audience: url.searchParams.getAll('audience'),
							sdg: url.searchParams.getAll('sdg'),
							customCategories,
							policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
							programTypes: url.searchParams.getAll('programType'),
							terms: url.searchParams.get('terms') ?? '',
							topics: url.searchParams.getAll('topic'),
							type: [payloadTypes.enum.program]
						},
						url.searchParams.get('sort') ?? ''
					)
		);
	}

	const filtered = filterOrganizationalUnits(
		filterVisible(containers, locals.user),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit ?? undefined
	);

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(
				filtered.map((c) => c.guid),
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
		_facets.set('sdg', fromCounts(sustainableDevelopmentGoals.options as string[], data?.sdg));
		_facets.set('topic', fromCounts(topics.options as string[], data?.topic));
		_facets.set(
			'policyFieldBNK',
			fromCounts(policyFieldBNK.options as string[], data?.policyFieldBNK)
		);
	}

	_facets.set('programType', fromCounts(programTypes.options as string[], data?.programType));

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

	return {
		containers: filtered,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
} satisfies ServerLoad);
