import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { type AnyContainer, isProgramContainer, predicates } from '$lib/models';
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
				url.searchParams.get('related-to') ?? container.guid,
				[predicates.enum['is-part-of']],
				{
					audience: url.searchParams.getAll('audience'),
					sdg: url.searchParams.getAll('sdg'),
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					terms: url.searchParams.get('terms') ?? '',
					topics: url.searchParams.getAll('topic')
				},
				url.searchParams.get('sort') ?? ''
			)
		);

		return {
			container,
			containers: filterVisible(containers, locals.user),
			revisions: filterVisible(revisions, locals.user),
			title: `${container.payload.title} / ${t('workspace.view.level')}`
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
