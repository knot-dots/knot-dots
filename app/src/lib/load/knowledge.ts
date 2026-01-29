import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import {
	payloadTypes,
	predicates,
	computeFacetCount,
	audience,
	fromCounts,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import { getAllRelatedContainers, getManyContainers } from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import type { PageServerLoad } from '../../routes/[[guid=uuid]]/knowledge/$types';

export default (async function load({ depends, locals, parent, url }) {
	depends('containers');

	let containers;
	const { currentOrganization } = await parent();
	const features = createFeatureDecisions(locals.features);

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				[predicates.enum['is-part-of']],
				{ type: [payloadTypes.enum.knowledge] },
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
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		...((url.searchParams.has('related-to')
			? [['relationType', new Map([[predicates.enum['is-part-of'], 0]])]]
			: []) as Array<[string, Map<string, number>]>),
		['audience', fromCounts(audience.options as string[], data?.audience)],
		['category', fromCounts(sustainableDevelopmentGoals.options as string[], data?.category)],
		['topic', fromCounts(topics.options as string[], data?.topic)],
		['policyFieldBNK', fromCounts(policyFieldBNK.options as string[], data?.policyFieldBNK)]
	]);

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

	return { containers: filtered, facets };
} satisfies PageServerLoad);
