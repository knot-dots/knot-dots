import { filterVisible } from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import { extractCustomCategoryFilters } from '$lib/load/customCategoryFilters';
import {
	audience,
	computeFacetCount,
	fromCounts,
	payloadTypes,
	policyFieldBNK,
	predicates,
	sustainableDevelopmentGoals,
	topics,
	type Container,
	type OrganizationContainer,
	type OrganizationalUnitContainer,
	type KeycloakUser
} from '$lib/models';
import { getAllRelatedContainers, getManyContainers } from '$lib/server/db';
import { getFacetAggregationsForGuids, getManyContainersWithES } from '$lib/server/elasticsearch';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import type { PageServerLoad } from '../../routes/[guid=uuid]/knowledge/$types';

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

export default (async function load({ depends, locals, parent, url }: LoadInput) {
	depends('containers');

	let containers: Container[];
	const customCategories = extractCustomCategoryFilters(url);
	const { currentOrganization, currentOrganizationalUnit } = (await parent()) as ParentData;
	const features = createFeatureDecisions(locals.features);

	const categoryContext = features.useCustomCategories()
		? await loadCategoryContext({
			connect: locals.pool.connect,
			organizationScope: [currentOrganization.guid],
			fallbackScope: [],
			user: locals.user as unknown as KeycloakUser
		})
		: null;

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				[predicates.enum['is-part-of']],
				{ customCategories, type: [payloadTypes.enum.knowledge] },
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
							categories: url.searchParams.getAll('category'),
							customCategories,
							policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
							programTypes: url.searchParams.getAll('programType'),
							terms: url.searchParams.get('terms') ?? '',
							topics: url.searchParams.getAll('topic'),
							type: [payloadTypes.enum.knowledge]
						},
						url.searchParams.get('sort') ?? ''
					)
				: getManyContainers(
						currentOrganization.payload.default ? [] : [currentOrganization.guid],
						{
							audience: url.searchParams.getAll('audience'),
							categories: url.searchParams.getAll('category'),
							customCategories,
							policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
							programTypes: url.searchParams.getAll('programType'),
							terms: url.searchParams.get('terms') ?? '',
							topics: url.searchParams.getAll('topic'),
							type: [payloadTypes.enum.knowledge]
						},
						url.searchParams.get('sort') ?? ''
					)
		);
	}

	const filtered = filterVisible(containers, locals.user);

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid), categoryContext?.keys ?? [])
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		...((url.searchParams.has('related-to')
			? [['relationType', new Map([[predicates.enum['is-part-of'], 0]])]]
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
		_facets.set('category', fromCounts(sustainableDevelopmentGoals.options as string[], data?.category));
		_facets.set('topic', fromCounts(topics.options as string[], data?.topic));
		_facets.set('policyFieldBNK', fromCounts(policyFieldBNK.options as string[], data?.policyFieldBNK));
	}

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

	return {
		containers: filtered,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
