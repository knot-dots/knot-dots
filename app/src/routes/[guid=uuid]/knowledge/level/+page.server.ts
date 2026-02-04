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
	topics
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import { buildCategoryFacetsWithCounts, loadCategoryContext } from '$lib/server/categoryOptions';
import type { CategoryOptions } from '$lib/categoryOptions';
import type { PageServerLoad } from './$types';

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
	const customCategories = extractCustomCategoryFilters(url);
	const { currentOrganization, defaultOrganizationGuid } = await parent();
	const features = createFeatureDecisions(locals.features);

	const mapFacetKey = (key: string) =>
		key === 'sdg' ? 'category' : key === 'policy_field_bnk' ? 'policyFieldBNK' : key;
	const mapFacets = (facets: Map<string, Map<string, number>>) => {
		const mapped = new Map<string, Map<string, number>>();
		for (const [key, values] of facets) {
			mapped.set(mapFacetKey(key), values);
		}
		return mapped;
	};
	const mapLabels = (labels?: Map<string, string>) => {
		if (!labels) return undefined;
		const mapped = new Map<string, string>();
		for (const [key, label] of labels) {
			mapped.set(mapFacetKey(key), label);
		}
		return mapped;
	};
	const mapOptions = (options?: CategoryOptions | null) => {
		if (!options) return null;
		const mappedOptions: CategoryOptions = {};
		for (const [key, value] of Object.entries(options)) {
			if (key === '__categoryLabels__') continue;
			if (!Array.isArray(value)) continue;
			mappedOptions[mapFacetKey(key)] = value;
		}
		const labelEntries = Object.entries(options.__categoryLabels__ ?? {}).map(([k, v]) => [
			mapFacetKey(k),
			v
		]);
		if (labelEntries.length) {
			mappedOptions.__categoryLabels__ = Object.fromEntries(labelEntries);
		}
		return mappedOptions;
	};

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
				objectTypes: [payloadTypes.enum.knowledge]
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
							categories: url.searchParams.getAll('category'),
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
							categories: url.searchParams.getAll('category'),
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

	const facets = features.useElasticsearch()
		? _facets
		: computeFacetCount(_facets, [...filtered, ...filteredPrograms]);

	return {
		containers: filtered,
		programs: filteredPrograms,
		facets: mapFacets(facets),
		facetLabels: mapLabels(categoryContext?.labels),
		categoryOptions: mapOptions(categoryContext?.options ?? null)
	};
}) satisfies PageServerLoad;
