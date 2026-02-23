import { filterVisible } from '$lib/authorization';
import {
	type Container,
	payloadTypes,
	predicates,
	type ProgramContainer,
	computeFacetCount,
	audience,
	fromCounts,
	policyFieldBNK,
	programTypes,
	sustainableDevelopmentGoals,
	topics,
	type OrganizationContainer
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

type ParentData = {
	currentOrganization: OrganizationContainer;
	defaultOrganizationGuid: string;
};

function isRelatedToSome(containers: Container[]) {
	return ({ relation }: Container) =>
		relation.some(
			({ predicate, subject }) =>
				predicate == predicates.enum['is-part-of-program'] &&
				containers.find(({ guid }) => guid == subject)
		);
}

export const load = (async ({ locals, url, parent }) => {
	let containers;
	const { currentOrganization, defaultOrganizationGuid } = (await parent()) as ParentData;
	const features = createFeatureDecisions(locals.features);
	const organizationScope = [currentOrganization.guid, defaultOrganizationGuid];

	const categoryContext = features.useCustomCategories()
		? await loadCategoryContext({
				connect: locals.pool.connect,
				organizationScope,
				fallbackScope: [],
				user: locals.user
			})
		: null;
	const customCategories = features.useCustomCategories()
		? extractCustomCategoryFilters(url, categoryContext?.keys ?? [])
		: {};

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
	} else if (url.searchParams.has('programType')) {
		containers = await locals.pool.connect(
			getAllRelatedContainersByProgramType(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.getAll('programType'),
				{
					customCategories,
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.knowledge]
				},
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
							topics: url.searchParams.getAll('topic'),
							programTypes: url.searchParams.getAll('programType'),
							terms: url.searchParams.get('terms') ?? '',
							type: [payloadTypes.enum.knowledge]
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
							topics: url.searchParams.getAll('topic'),
							programTypes: url.searchParams.getAll('programType'),
							terms: url.searchParams.get('terms') ?? '',
							type: [payloadTypes.enum.knowledge]
						},
						url.searchParams.get('sort') ?? ''
					)
		);
	}

	const programs = (await locals.pool.connect(
		features.useElasticsearch()
			? getManyContainersWithES(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{ type: [payloadTypes.enum.program] },
					url.searchParams.get('sort') ?? ''
				)
			: getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{ type: [payloadTypes.enum.program] },
					url.searchParams.get('sort') ?? ''
				)
	)) as ProgramContainer[];

	const filtered = filterVisible(containers, locals.user);
	const filteredPrograms = filterVisible(programs.filter(isRelatedToSome(containers)), locals.user);

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(
				filtered.map((c) => c.guid),
				categoryContext?.keys ?? []
			)
		: undefined;

	const _facets = new Map<string, Map<string, number>>();

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

	const facets = features.useElasticsearch()
		? _facets
		: computeFacetCount(_facets, [...filtered, ...filteredPrograms]);

	return {
		containers: filtered,
		programs: filteredPrograms,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
