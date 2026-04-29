import { filterVisible } from '$lib/authorization';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
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
	type AnyContainer
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

function isRelatedToSome(containers: AnyContainer[]) {
	return ({ relation }: Container) =>
		relation.some(
			({ predicate, subject }) =>
				predicate == predicates.enum['is-part-of-program'] &&
				containers.find(({ guid }) => guid == subject)
		);
}

export const load = (async ({ locals, url, parent }) => {
	let containers;
	let data: Record<string, Record<string, number>> | undefined;
	const { categoryContext: rawCategoryContext, currentOrganization } = await parent();
	const features = createFeatureDecisions(locals.features);
	const categoryContext = rawCategoryContext
		? filterCategoryContext(rawCategoryContext, [payloadTypes.enum.knowledge])
		: null;
	const useCustomCategories = features.useCustomCategories();

	const customCategories = useCustomCategories
		? extractCustomCategoryFilters(url, categoryContext?.keys ?? [])
		: {};

	const coreCategoryFilters = useCustomCategories
		? {}
		: {
				audience: url.searchParams.getAll('audience'),
				sdg: url.searchParams.getAll('sdg'),
				policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
				topics: url.searchParams.getAll('topic')
			};

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
		if (features.useElasticsearch()) {
			const esResult = await getManyContainersWithES(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					...coreCategoryFilters,
					customCategories,
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.knowledge]
				},
				url.searchParams.get('sort') ?? '',
				undefined,
				{ customCategoryKeys: categoryContext?.keys ?? [], includeFacets: true }
			);
			containers = esResult.containers;
			data = esResult.facets;
		} else {
			containers = await locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						...coreCategoryFilters,
						customCategories,
						programTypes: url.searchParams.getAll('programType'),
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.knowledge]
					},
					url.searchParams.get('sort') ?? ''
				)
			);
		}
	}

	let programs: ProgramContainer[];
	if (features.useElasticsearch()) {
		const esPrograms = await getManyContainersWithES(
			currentOrganization.payload.default ? [] : [currentOrganization.guid],
			{ type: [payloadTypes.enum.program] },
			url.searchParams.get('sort') ?? '',
			undefined,
			{ includeFacets: false }
		);
		programs = esPrograms.containers as ProgramContainer[];
	} else {
		programs = (await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{ type: [payloadTypes.enum.program] },
				url.searchParams.get('sort') ?? ''
			)
		)) as ProgramContainer[];
	}

	const filtered = filterVisible(containers, locals.user);
	const filteredPrograms = filterVisible(programs.filter(isRelatedToSome(containers)), locals.user);

	const _facets = new Map<string, Map<string, number>>();

	if (useCustomCategories && categoryContext) {
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
		: computeFacetCount(_facets, [...filtered, ...filteredPrograms], {
				useCategoryPayload: useCustomCategories
			});

	return {
		containers: filtered,
		programs: filteredPrograms,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
