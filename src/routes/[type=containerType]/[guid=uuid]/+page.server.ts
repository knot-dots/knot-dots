import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import {
	isIndicatorContainer,
	isInternalObjectiveContainer,
	isStrategyContainer
} from '$lib/models';
import type { Container, ContainerWithObjective, PayloadType } from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllContainersRelatedToStrategy,
	getAllContainersRelatedToIndicator,
	getAllRelatedContainers,
	getAllRelatedInternalObjectives,
	getAllContainersWithParentObjectives
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
	let containersWithObjectives: ContainerWithObjective[] | undefined;

	if (isInternalObjectiveContainer(container)) {
		relatedContainers = await locals.pool.connect(
			getAllRelatedInternalObjectives(params.guid, ['hierarchical'], '')
		);
	} else if (isStrategyContainer(container)) {
		relatedContainers = await locals.pool.connect(
			getAllContainersRelatedToStrategy(container.revision, {
				type: url.searchParams.getAll('payloadType') as PayloadType[]
			})
		);
	} else if (isIndicatorContainer(container)) {
		[relatedContainers, containersWithObjectives] = await Promise.all([
			locals.pool.connect(getAllContainersRelatedToIndicator(container.guid)),
			locals.pool.connect(getAllContainersWithParentObjectives(container))
		]);
	} else {
		relatedContainers = await locals.pool.connect(
			getAllRelatedContainers([container.organization], params.guid, ['hierarchical'], {}, '')
		);
	}

	return {
		container,
		containersWithObjectives,
		relatedContainers: filterVisible(relatedContainers, locals.user),
		revisions
	};
}) satisfies PageServerLoad;
