import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import {
	filterOrganizationalUnits,
	type GoalContainer,
	isGoalContainer,
	isPartOf,
	isTaskContainer,
	payloadTypes,
	predicates,
	type TaskContainer,
	computeFacetCount,
	fromCounts,
	taskCategories
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getFacetAggregationsForGuids, getManyContainersWithES } from '$lib/server/elasticsearch';
import type { ServerLoad } from '@sveltejs/kit';

type LoadInput = {
	depends: (deps: string) => void;
	locals: App.Locals;
	parent: () => Promise<unknown>;
	url: URL;
};

type ParentData = {
	currentOrganization: import('$lib/models').OrganizationContainer;
	currentOrganizationalUnit: import('$lib/models').OrganizationalUnitContainer | null;
};

function filterRelated(
	containers: GoalContainer[],
	taskContainers: TaskContainer[]
): GoalContainer[] {
	return containers.filter((c) => taskContainers.some(isPartOf(c)));
}

export default function load(defaultSort: 'alpha' | 'modified' | 'priority') {
	return (async ({ depends, locals, parent, url }: LoadInput) => {
		depends('containers');

		let taskContainers: TaskContainer[];
		let otherContainers: GoalContainer[];
		let subordinateOrganizationalUnits: string[] = [];

		const { currentOrganization, currentOrganizationalUnit } = (await parent()) as ParentData;
		const features = createFeatureDecisions(locals.features);

		if (currentOrganization.payload.default) {
			error(404, unwrapFunctionStore(_)('error.not_found'));
		}

		if (currentOrganizationalUnit) {
			const relatedOrganizationalUnits = (await locals.pool.connect(
				getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
			)) as import('$lib/models').OrganizationalUnitContainer[];
			subordinateOrganizationalUnits = relatedOrganizationalUnits
				.filter((unit) => unit.payload.level > currentOrganizationalUnit.payload.level)
				.map((unit) => unit.guid);
		}

		if (url.searchParams.has('related-to')) {
			const containers = await locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					[predicates.enum['is-part-of'], predicates.enum['is-prerequisite-for']],
					{},
					url.searchParams.get('sort') ?? defaultSort
				)
			);
			taskContainers = containers.filter(isTaskContainer);
			otherContainers = containers.filter(isGoalContainer);
		} else {
			[taskContainers, otherContainers] = (await Promise.all([
				locals.pool.connect(
					features.useElasticsearch()
						? getManyContainersWithES(
								currentOrganization.payload.default ? [] : [currentOrganization.guid],
								{
									assignees: url.searchParams.getAll('assignee'),
									taskCategories: url.searchParams.getAll('taskCategory'),
									terms: url.searchParams.get('terms') ?? '',
									type: [payloadTypes.enum.task]
								},
								url.searchParams.get('sort') ?? defaultSort
							)
						: getManyContainers(
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
					features.useElasticsearch()
						? getManyContainersWithES(
								currentOrganization.payload.default ? [] : [currentOrganization.guid],
								{
									type: [payloadTypes.enum.goal]
								},
								'alpha'
							)
						: getManyContainers(
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
			currentOrganizationalUnit ?? undefined
		);
		const relatedContainers = filterOrganizationalUnits(
			filterVisible(filterRelated(otherContainers, containers), locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit ?? undefined
		);

		const data = features.useElasticsearch()
			? await getFacetAggregationsForGuids(containers.map((c) => c.guid))
			: undefined;

		const _facets = new Map<string, Map<string, number>>([
			...((url.searchParams.has('related-to')
				? [
						[
							'relationType',
							new Map([
								[predicates.enum['is-part-of'], 0],
								[predicates.enum['is-prerequisite-for'], 0]
							])
						]
					]
				: []) as Array<[string, Map<string, number>]>),
			...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
				[string, Map<string, number>]
			>),
			['taskCategory', fromCounts(taskCategories.options as string[], data?.taskCategory)],
			['assignee', new Map()]
		]);

		const facets = features.useElasticsearch()
			? _facets
			: computeFacetCount(_facets, taskContainers);

		return { containers, relatedContainers, facets };
	}) satisfies ServerLoad;
}
