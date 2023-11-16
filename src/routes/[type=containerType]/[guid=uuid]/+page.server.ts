import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { payloadTypes } from '$lib/models';
import type { Container, PayloadType } from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllContainersRelatedToStrategy,
	getAllRelatedContainers,
	getAllRelatedInternalObjectives
} from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { filterVisible } from '$lib/authorization';

export const load = (async ({ params, locals, url }) => {
	let revisions;

	try {
		revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(params.guid));
	} catch (e) {
		if (e instanceof NotFoundError) {
			throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}

	const container = revisions[revisions.length - 1];

	let relatedContainers: Container[];
	if (params.type.includes('internal_objective')) {
		relatedContainers = await locals.pool.connect(
			getAllRelatedInternalObjectives(params.guid, ['hierarchical'], '')
		);
	} else if (params.type === payloadTypes.enum.strategy) {
		relatedContainers = await locals.pool.connect(
			getAllContainersRelatedToStrategy(container.revision, {
				type: url.searchParams.getAll('payloadType') as PayloadType[]
			})
		);
	} else {
		relatedContainers = await locals.pool.connect(
			getAllRelatedContainers([container.organization], params.guid, ['hierarchical'], {}, '')
		);
	}

	return { container, relatedContainers: filterVisible(relatedContainers, locals.user), revisions };
}) satisfies PageServerLoad;
