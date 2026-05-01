import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
import {
	type AnyContainer,
	computeFacetCount,
	fromCounts,
	isProgramContainer,
	resourceCategories,
	resourceUnits
} from '$lib/models';
import { getAllContainerRevisionsByGuid } from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import { fetchResources } from '$lib/load/resources';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, params, url }) => {
	depends('containers');

	const t = unwrapFunctionStore(_);
	const { categoryContext } = await parent();
	const features = createFeatureDecisions(locals.features);

	const customCategories = extractCustomCategoryFilters(url, categoryContext?.keys ?? []);
	try {
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(params.contentGuid));
		const container = revisions.at(-1) as AnyContainer;

		if (!defineAbilityFor(locals.user).can('read', container)) {
			error(404, { message: t('error.not_found') });
		}

		if (!isProgramContainer(container)) {
			error(404, { message: t('error.not_found') });
		}

		// Use shared fetchResources function
		const { resourceContainers } = await fetchResources({
			pool: locals.pool,
			scope: [container.organization],
			programGuid: container.guid,
			features,
			customCategories,
			resourceCategoryFilters: url.searchParams.getAll('resourceCategory'),
			sort: (url.searchParams.get('sort') ?? 'alpha') as 'alpha' | 'modified' | 'priority',
			...(categoryContext && { categoryContext })
		});

		const containers = filterVisible(resourceContainers, locals.user);

		// Compute facets for the filtered containers
		const _facets = new Map<string, Map<string, number>>([
			['resourceCategory', fromCounts(resourceCategories.options as string[], undefined)],
			['resourceUnit', fromCounts(resourceUnits.options as string[], undefined)]
		]);

		if (categoryContext) {
			const customFacets = buildCategoryFacetsWithCounts(categoryContext.options, {});
			for (const [key, values] of customFacets.entries()) {
				_facets.set(key, values);
			}
		}

		const facets = computeFacetCount(_facets, containers);

		return {
			container,
			containers,
			facets,
			facetLabels: categoryContext?.labels,
			categoryOptions: categoryContext?.options ?? null,
			revisions: filterVisible(revisions, locals.user),
			title: `${container.payload.title} / ${t('workspace.type.resources')} / ${t('workspace.view.catalog')}`
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
