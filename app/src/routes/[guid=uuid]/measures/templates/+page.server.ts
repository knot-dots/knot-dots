import { filterVisible } from '$lib/authorization';
import {
	filterOrganizationalUnits,
	payloadTypes,
	computeFacetCount,
	audience,
	fromCounts,
	measureTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import { extractCustomCategoryFilters } from '$lib/load/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	let subordinateOrganizationalUnits: string[] = [];
	const customCategories = extractCustomCategoryFilters(url);
	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const features = createFeatureDecisions(locals.features);

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	const containers = await locals.pool.connect(
		features.useElasticsearch()
			? getManyContainersWithES(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						customCategories,
						measureTypes: url.searchParams.getAll('measureType'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						template: true,
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.measure]
					},
					url.searchParams.get('sort') ?? ''
				)
			: getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						customCategories,
						measureTypes: url.searchParams.getAll('measureType'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						topics: url.searchParams.getAll('topic'),
						template: true,
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.measure]
					},
					url.searchParams.get('sort') ?? ''
				)
	);

	const filtered = filterOrganizationalUnits(
		filterVisible(containers, locals.user),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit
	);

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>),
		['audience', fromCounts(audience.options as string[], data?.audience)],
		['category', fromCounts(sustainableDevelopmentGoals.options as string[], data?.category)],
		['topic', fromCounts(topics.options as string[], data?.topic)],
		['policyFieldBNK', fromCounts(policyFieldBNK.options as string[], data?.policyFieldBNK)],
		['measureType', fromCounts(measureTypes.options as string[], data?.measureType)]
	]);

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, filtered);

	return {
		containers: filtered,
		facets
	};
}) satisfies PageServerLoad;
