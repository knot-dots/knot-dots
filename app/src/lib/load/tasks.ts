import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import {
	filterOrganizationalUnits,
	type GoalContainer,
	isGoalContainer,
	isPartOf,
	isTaskContainer,
	payloadTypes,
	predicates,
	type TaskContainer
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from '../../routes/tasks/$types';

function filterRelated(
	containers: GoalContainer[],
	taskContainers: TaskContainer[]
): GoalContainer[] {
	return containers.filter((c) => taskContainers.some(isPartOf(c)));
}

export default function load(defaultSort: 'alpha' | 'modified' | 'priority') {
	return (async ({ locals, url, parent }) => {
		let taskContainers: TaskContainer[];
		let otherContainers: GoalContainer[];
		let subordinateOrganizationalUnits: string[] = [];

		const { currentOrganization, currentOrganizationalUnit } = await parent();

		if (currentOrganization.payload.default) {
			error(404, unwrapFunctionStore(_)('error.not_found'));
		}

		if (currentOrganizationalUnit) {
			const relatedOrganizationalUnits = await locals.pool.connect(
				getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
			);
			subordinateOrganizationalUnits = relatedOrganizationalUnits
				.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
				.map(({ guid }) => guid);
		}

		if (url.searchParams.has('related-to')) {
			const containers = await locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					[
						predicates.enum['is-part-of'],
						predicates.enum['is-prerequisite-for'],
						predicates.enum['is-subtask-of']
					],
					{},
					url.searchParams.get('sort') ?? defaultSort
				)
			);
			taskContainers = containers.filter(isTaskContainer);
			otherContainers = containers.filter(isGoalContainer);
		} else {
			[taskContainers, otherContainers] = (await Promise.all([
				locals.pool.connect(
					getManyContainers(
						currentOrganization.payload.default ? [] : [currentOrganization.guid],
						{
							assignees: url.searchParams.getAll('assignee'),
							taskCategories: url.searchParams.getAll('taskCategory'),
							terms: url.searchParams.get('terms') ?? '',
							type: [payloadTypes.enum.task]
						},
						url.searchParams.get('sort') ?? defaultSort
					)
				),
				locals.pool.connect(
					getManyContainers(
						currentOrganization.payload.default ? [] : [currentOrganization.guid],
						{
							type: [payloadTypes.enum.goal]
						},
						'alpha'
					)
				)
			])) as [TaskContainer[], GoalContainer[]];
		}

		const containers = filterOrganizationalUnits(
			filterVisible(taskContainers, locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit
		);

		return {
			containers,
			relatedContainers: filterOrganizationalUnits(
				filterVisible(filterRelated(otherContainers, containers), locals.user),
				url,
				subordinateOrganizationalUnits,
				currentOrganizationalUnit
			)
		};
	}) satisfies PageServerLoad;
}
