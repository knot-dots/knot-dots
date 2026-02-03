import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { type AnyContainer, isProgramContainer, payloadTypes, predicates } from '$lib/models';
import { getAllContainerRevisionsByGuid, getAllRelatedContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, params, url }) => {
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

		const containers = await locals.pool.connect(
			getAllRelatedContainers(
				[container.organization],
				container.guid,
				[predicates.enum['is-part-of-program']],
				{
					categories: url.searchParams.getAll('category'),
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					taskCategories: url.searchParams.getAll('taskCategory'),
					terms: url.searchParams.get('terms') ?? '',
					topics: url.searchParams.getAll('topic'),
					type: [
						payloadTypes.enum.effect,
						payloadTypes.enum.goal,
						payloadTypes.enum.indicator,
						payloadTypes.enum.measure,
						payloadTypes.enum.simple_measure,
						payloadTypes.enum.task
					]
				},
				url.searchParams.get('sort') ?? ''
			)
		);

		return {
			container,
			containers: filterVisible(containers, locals.user),
			revisions: filterVisible(revisions, locals.user),
			title: `${container.payload.title} / ${t('workspace.type.measures')} / ${t('workspace.view.monitoring')}`
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
