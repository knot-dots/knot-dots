import { filterVisible } from '$lib/authorization';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
import {
	type AnyContainer,
	computeFacetCount,
	type Container,
	fromCounts,
	payloadTypes,
	predicates,
	type ProgramContainer,
	programTypes
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
	const categoryContext = filterCategoryContext(rawCategoryContext, [payloadTypes.enum.knowledge]);
	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);

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
					customCategories,
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.knowledge]
				},
				url.searchParams.get('sort') ?? '',
				{ customCategoryKeys: categoryContext.keys, includeFacets: true }
			);
			containers = esResult.containers;
			data = esResult.facets;
		} else {
			containers = await locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
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

	const customFacets = buildCategoryFacetsWithCounts(
		categoryContext.options,
		data ? Object.fromEntries(Object.entries(data)) : {}
	);
	for (const [key, values] of customFacets.entries()) {
		_facets.set(key, values);
	}

	_facets.set('programType', fromCounts(programTypes.options as string[], data?.programType));

	const facets = features.useElasticsearch()
		? _facets
		: computeFacetCount(_facets, [...filtered, ...filteredPrograms]);

	return {
		containers: filtered,
		programs: filteredPrograms,
		facets,
		facetLabels: categoryContext.labels,
		categoryOptions: categoryContext.options
	};
}) satisfies PageServerLoad;
