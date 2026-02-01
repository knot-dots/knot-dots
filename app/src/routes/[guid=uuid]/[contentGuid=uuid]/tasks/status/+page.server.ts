import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	type GoalContainer,
	isMeasureContainer,
	isSimpleMeasureContainer,
	payloadTypes,
	predicates,
	type TaskContainer
} from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllContainersRelatedToMeasure,
	getAllRelatedContainers
} from '$lib/server/db';
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

		if (!isMeasureContainer(container) && !isSimpleMeasureContainer(container)) {
			error(404, { message: t('error.not_found') });
		}

		const containers = (await locals.pool.connect(
			url.searchParams.has('related-to')
				? getAllRelatedContainers(
						[container.organization],
						url.searchParams.get('related-to') as string,
						[predicates.enum['is-part-of']],
						{
							assignees: url.searchParams.getAll('assignee'),
							taskCategories: url.searchParams.getAll('taskCategory'),
							terms: url.searchParams.get('terms') ?? '',
							type: [payloadTypes.enum.goal, payloadTypes.enum.task]
						},
						'priority'
					)
				: getAllContainersRelatedToMeasure(
						container.guid,
						{
							assignees: url.searchParams.getAll('assignee'),
							taskCategories: url.searchParams.getAll('taskCategory'),
							terms: url.searchParams.get('terms') ?? '',
							type: [payloadTypes.enum.goal, payloadTypes.enum.task]
						},
						'priority'
					)
		)) as Array<GoalContainer | TaskContainer>;

		return {
			container,
			containers: filterVisible(containers, locals.user),
			revisions: filterVisible(revisions, locals.user),
			title: `${container.payload.title} / ${t('workspace.type.tasks')} / ${t('workspace.view.status')}`
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
