import { filterVisible } from '$lib/authorization';
import {
	isContainerWithEffect,
	isMemberOf,
	computeFacetCount,
	audience,
	fromCounts,
	payloadTypes,
	policyFieldBNK,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import { getAllContainersRelatedToUser } from '$lib/server/db';
import { createFeatureDecisions } from '$lib/features';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/server/categoryOptions';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';

export const load = (async ({ locals, parent }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const { categoryContext: rawCategoryContext } = await parent();
	const categoryContext = rawCategoryContext
		? filterCategoryContext(rawCategoryContext, [
				payloadTypes.enum.measure,
				payloadTypes.enum.simple_measure
			])
		: null;

	const containers = await locals.pool.connect(getAllContainersRelatedToUser(locals.user.guid));

	const filtered = filterVisible(
		containers.filter(isContainerWithEffect).filter((c) => isMemberOf(locals.user, c)),
		locals.user
	);

	const features = createFeatureDecisions(locals.features);

	const _facets = new Map<string, Map<string, number>>();

	if (features.useCustomCategories() && categoryContext) {
		const customFacets = buildCategoryFacetsWithCounts(categoryContext.options);
		for (const [key, values] of customFacets.entries()) {
			_facets.set(key, values);
		}
	} else {
		_facets.set('audience', fromCounts(audience.options as string[]));
		_facets.set('sdg', fromCounts(sustainableDevelopmentGoals.options as string[]));
		_facets.set('topic', fromCounts(topics.options as string[]));
		_facets.set('policyFieldBNK', fromCounts(policyFieldBNK.options as string[]));
	}

	const facets = computeFacetCount(_facets, filtered, {
		useCategoryPayload: features.useCustomCategories()
	});

	return {
		containers: filtered,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
