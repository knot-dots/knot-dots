import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { type AnyContainer, predicates } from '$lib/models';
import { getAllContainerRevisionsByGuid, getAllRelatedContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import defineAbilityFor, { filterVisible } from '$lib/authorization';

export const load = (async ({ locals, params }) => {
	try {
		const [revisions, relatedContainers] = await Promise.all([
			locals.pool.connect(getAllContainerRevisionsByGuid(params.contentGuid)),
			locals.pool.connect(
				getAllRelatedContainers([], params.guid, [predicates.enum['is-section-of']], {}, '')
			)
		]);

		const container = revisions.at(-1) as AnyContainer;

		if (!defineAbilityFor(locals.user).can('read', container)) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}

		return {
			container,
			relatedContainers: filterVisible(relatedContainers, locals.user),
			revisions: filterVisible(revisions, locals.user),
			title: 'title' in container.payload ? container.payload.title : container.payload.name
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
