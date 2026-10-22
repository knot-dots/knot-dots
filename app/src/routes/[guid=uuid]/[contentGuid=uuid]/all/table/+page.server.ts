import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { fetchProgramParts } from '$lib/load/programParts';
import { type AnyPayload, type Container, isProgramContainer } from '$lib/models';
import { getAllContainerRevisionsByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// The table is an alternative view of the levels board and shows the same objects.
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

		const { categoryContext } = await parent();

		const containers = await fetchProgramParts({
			categoryContext,
			pool: locals.pool,
			program: container,
			url,
			user: locals.user
		});

		return {
			container,
			containers,
			revisions: filterVisible(revisions, locals.user),
			title: t('workspace.view.table')
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
