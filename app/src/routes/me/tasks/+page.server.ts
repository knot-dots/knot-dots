import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import {
	isAssignedTo,
	isTaskContainer,
	computeFacetCount,
	fromCounts,
	taskCategories
} from '$lib/models';
import { getAllContainersRelatedToUser } from '$lib/server/db';
import { getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import { createFeatureDecisions } from '$lib/features';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const containers = await locals.pool.connect(getAllContainersRelatedToUser(locals.user.guid));

	const filtered = filterVisible(
		containers.filter(isTaskContainer).filter(isAssignedTo(locals.user)),
		locals.user
	);

	const features = createFeatureDecisions(locals.features);
	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		['taskCategory', fromCounts(taskCategories.options as string[], data?.taskCategory)]
	]);

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, filtered);

	return {
		containers: filtered,
		facets
	};
};
