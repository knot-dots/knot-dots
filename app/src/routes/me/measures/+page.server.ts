import { filterVisible } from '$lib/authorization';
import {
	isContainerWithEffect,
	isMemberOf,
	computeFacetCount,
	audience,
	fromCounts,
	measureTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import { getAllContainersRelatedToUser } from '$lib/server/db';
import { getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const containers = await locals.pool.connect(getAllContainersRelatedToUser(locals.user.guid));

	const filtered = filterVisible(
		containers.filter(isContainerWithEffect).filter((c) => isMemberOf(locals.user, c)),
		locals.user
	);

	const features = createFeatureDecisions(locals.features);
	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
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
};
