import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import {
	type GoalContainer,
	isPartOf,
	payloadTypes,
	predicates,
	type TaskContainer
} from '$lib/models';
import { MAX_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/tasks/$types';

const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-part-of'],
	predicates.enum['is-prerequisite-for']
];

function filterRelated(goals: GoalContainer[], tasks: TaskContainer[]): GoalContainer[] {
	return goals.filter((goal) => tasks.some(isPartOf(goal)));
}

export default function load(
	defaultSort: 'alpha' | 'modified' | 'priority',
	options: { omitStatusFacet?: boolean } = {}
) {
	return (async ({ depends, fetch, params, parent, url }) => {
		depends('containers');

		const query = new URLSearchParams([...url.searchParams, ['type', payloadTypes.enum.task]]);
		query.set('sort', url.searchParams.get('sort') ?? defaultSort);

		if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
			for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
		}

		const goalQuery = new URLSearchParams([['type', payloadTypes.enum.goal]]);

		const [data, goalData, { categoryContext, currentOrganization }] = await Promise.all([
			fetchContainerPage<TaskContainer>({
				contextGuid: params.guid,
				fetch,
				limit: MAX_PAGE_SIZE,
				offset: 0,
				query
			}),
			fetchContainerPage<GoalContainer>({
				contextGuid: params.guid,
				fetch,
				limit: MAX_PAGE_SIZE,
				offset: 0,
				query: goalQuery
			}),
			parent()
		]);

		if (currentOrganization.payload.default) {
			error(404, unwrapFunctionStore(_)('error.not_found'));
		}

		const filteredCategoryContext = filterCategoryContext(categoryContext, [
			payloadTypes.enum.task
		]);

		return {
			containers: data.containers,
			relatedContainers: filterRelated(goalData.containers, data.containers),
			facets: url.searchParams.has('related-to')
				? new Map([['relationType', new Map(DEFAULT_RELATION_TYPES.map((rt) => [rt, 0]))]])
				: new Map([
						...((!currentOrganization.payload.default
							? [['included', new Map<string, number>()]]
							: []) as Array<[string, Map<string, number>]>),
						...((options.omitStatusFacet
							? []
							: [
									[
										'status',
										new Map(
											[...(data.facets.get('status') ?? [])].filter(
												([k]) => k !== 'status.in_operation'
											)
										)
									]
								]) as Array<[string, Map<string, number>]>),
						['taskCategory', data.facets.get('taskCategory') ?? new Map()],
						['assignee', data.facets.get('assignee') ?? new Map()],
						...[...data.facets].filter(([key]) => filteredCategoryContext.keys.includes(key))
					])
		};
	}) satisfies PageServerLoad;
}
