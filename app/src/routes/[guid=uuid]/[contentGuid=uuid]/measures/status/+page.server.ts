import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { filterCategoryContext } from '$lib/categoryOptions';
import {
	type AnyContainer,
	filterMembers,
	isProgramContainer,
	type MeasureContainer,
	payloadTypes,
	predicates,
	type SimpleMeasureContainer
} from '$lib/models';
import { getAllContainerRevisionsByGuid, getAllRelatedContainers } from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, params, parent, url }) => {
	depends('containers');

	const t = unwrapFunctionStore(_);

	try {
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(params.contentGuid));
		const container = revisions.at(-1) as AnyContainer;

		if (!defineAbilityFor(locals.user).can('read', container)) {
			error(404, { message: t('error.not_found') });
		}

		if (!isProgramContainer(container)) {
			error(404, { message: t('error.not_found') });
		}

		const { categoryContext } = await parent();

		const containers = (await locals.pool.connect(
			getAllRelatedContainers(
				[container.organization],
				container.guid,
				[predicates.enum['is-part-of-program']],
				{
					customCategories: extractCustomCategoryFilters(
						url,
						filterCategoryContext(categoryContext, [
							payloadTypes.enum.measure,
							payloadTypes.enum.simple_measure
						]).keys
					),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
				},
				url.searchParams.get('sort') ?? ''
			)
		)) as Array<MeasureContainer | SimpleMeasureContainer>;

		return {
			container,
			containers: filterMembers(
				filterVisible(containers, locals.user),
				url.searchParams.getAll('member')
			),
			revisions: filterVisible(revisions, locals.user),
			title: `${container.payload.title} / ${t('workspace.type.measures')} / ${t('workspace.view.status')}`
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
