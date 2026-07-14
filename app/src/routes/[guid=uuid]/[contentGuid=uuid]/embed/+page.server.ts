import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { type AnyPayload, type Container, predicates, visibility } from '$lib/models';
import { getAllContainerRevisionsByGuid, getAllRelatedContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

function isPublic(container: Container<AnyPayload>): boolean {
	return container.payload.visibility === visibility.enum.public;
}

export const load = (async ({ locals, params }) => {
	try {
		const [revisions, sections] = await Promise.all([
			locals.pool.connect(getAllContainerRevisionsByGuid(params.contentGuid)),
			locals.pool.connect(
				getAllRelatedContainers([], params.contentGuid, [predicates.enum['is-section-of']], {}, '')
			)
		]);

		const container = revisions.at(-1) as Container<AnyPayload>;

		if (!isPublic(container)) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}

		return {
			container,
			revisions: revisions.filter(isPublic),
			sections: sections.filter(isPublic),
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
