import { filterVisible } from '$lib/authorization';
import { isContainerWithEffect, isMemberOf } from '$lib/models';
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
	const facets = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: {};

	return {
		containers: filtered,
		facets
	};
};
