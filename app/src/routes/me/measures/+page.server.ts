import { filterVisible } from '$lib/authorization';
import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
import { isContainerWithEffect, isMemberOf, computeFacetCount, payloadTypes } from '$lib/models';
import { getAllContainersRelatedToUser } from '$lib/server/db';
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

	const _facets = new Map<string, Map<string, number>>();

	if (categoryContext) {
		const customFacets = buildCategoryFacetsWithCounts(categoryContext.options);
		for (const [key, values] of customFacets.entries()) {
			_facets.set(key, values);
		}
	}

	const facets = computeFacetCount(_facets, filtered);

	return {
		containers: filtered,
		facets,
		facetLabels: categoryContext?.labels,
		categoryOptions: categoryContext?.options ?? null
	};
}) satisfies PageServerLoad;
