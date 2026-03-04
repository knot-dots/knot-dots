import { filterVisible } from '$lib/authorization';
import {
	isContainerWithEffect,
	isMemberOf,
	computeFacetCount,
	audience,
	fromCounts,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import { getAllContainersRelatedToUser } from '$lib/server/db';
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
	const _facets = new Map<string, Map<string, number>>([
		['audience', fromCounts(audience.options as string[])],
		['sdg', fromCounts(sustainableDevelopmentGoals.options as string[])],
		['topic', fromCounts(topics.options as string[])],
		['policyFieldBNK', fromCounts(policyFieldBNK.options as string[])]
	]);
	const facets = computeFacetCount(_facets, filtered, {
		useCategoryPayload: features.useCustomCategories()
	});

	return {
		containers: filtered,
		facets
	};
};
