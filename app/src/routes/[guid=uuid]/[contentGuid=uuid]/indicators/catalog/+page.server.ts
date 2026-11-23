import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { filterCategoryContext } from '$lib/categoryOptions';
import {
	type AnyPayload,
	type Container,
	isBinaryIndicatorContainer,
	isIndicatorContainer,
	isProgramContainer,
	payloadTypes
} from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllContainersRelatedToProgram,
	getManyContainers
} from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, params, parent, url }) => {
	depends('containers');

	const t = unwrapFunctionStore(_);

	try {
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(params.contentGuid));
		const container = revisions.at(-1) as Container<AnyPayload>;

		if (!defineAbilityFor(locals.user).can('read', container)) {
			error(404, { message: t('error.not_found') });
		}

		if (!isProgramContainer(container)) {
			error(404, { message: t('error.not_found') });
		}

		const related = await locals.pool.connect(
			getAllContainersRelatedToProgram(container.guid, {}, '')
		);

		// Search and filters apply to the indicators only. The other containers
		// connect the indicators with the program and are needed by the cards.
		const isIndicator = (c: Container<AnyPayload>) =>
			isIndicatorContainer(c) || isBinaryIndicatorContainer(c);

		const { categoryContext } = await parent();

		const filters = {
			customCategories: extractCustomCategoryFilters(
				url,
				filterCategoryContext(categoryContext, [
					payloadTypes.enum.indicator,
					payloadTypes.enum.binary_indicator
				]).keys
			),
			indicatorCategories: url.searchParams.getAll('indicatorCategory'),
			indicatorTypes: url.searchParams.getAll('indicatorType'),
			terms: url.searchParams.get('terms') ?? ''
		};

		const isFiltered =
			filters.terms !== '' ||
			filters.indicatorCategories.length > 0 ||
			filters.indicatorTypes.length > 0 ||
			Object.values(filters.customCategories).some((values) => values.length > 0);

		const indicatorGuids = related.filter(isIndicator).map(({ guid }) => guid);

		const matching =
			isFiltered && indicatorGuids.length > 0
				? new Set(
						(
							await locals.pool.connect(
								getManyContainers(
									[],
									{
										...filters,
										guid: indicatorGuids,
										type: [payloadTypes.enum.indicator, payloadTypes.enum.binary_indicator]
									},
									'alpha'
								)
							)
						).map(({ guid }) => guid)
					)
				: undefined;

		const containers = matching
			? related.filter((c) => !isIndicator(c) || matching.has(c.guid))
			: related;

		return {
			container,
			containers: filterVisible(containers, locals.user),
			revisions: filterVisible(revisions, locals.user),
			title: t('workspace.indicators.title')
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
