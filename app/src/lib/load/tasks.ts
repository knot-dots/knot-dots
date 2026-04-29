import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import {
	computeFacetCount,
	filterOrganizationalUnits,
	fromCounts,
	type GoalContainer,
	isGoalContainer,
	isPartOf,
	isTaskContainer,
	payloadTypes,
	predicates,
	taskCategories,
	type TaskContainer
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { PageServerLoad } from '../../routes/[guid=uuid]/tasks/$types';

function filterRelated(
	containers: GoalContainer[],
	taskContainers: TaskContainer[]
): GoalContainer[] {
	return containers.filter((c) => taskContainers.some(isPartOf(c)));
}

export default function load(defaultSort: 'alpha' | 'modified' | 'priority') {
	return (async ({ depends, locals, parent, url }) => {
		depends('containers');

		let taskContainers: TaskContainer[];
		let otherContainers: GoalContainer[];
		let subordinateOrganizationalUnits: string[] = [];

		const { currentOrganization, currentOrganizationalUnit, categoryContext } = await parent();
		const features = createFeatureDecisions(locals.features);
		const useCustomCategories = features.useCustomCategories();

		const customCategories = useCustomCategories
			? extractCustomCategoryFilters(url, categoryContext?.keys ?? [])
			: {};

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

		let data: Record<string, Record<string, number>> | undefined;
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
			if (features.useElasticsearch()) {
				const [taskResult, otherResult] = await Promise.all([
					getManyContainersWithES(
						currentOrganization.payload.default ? [] : [currentOrganization.guid],
						{
							assignees: url.searchParams.getAll('assignee'),
							customCategories,
							taskCategories: url.searchParams.getAll('taskCategory'),
							terms: url.searchParams.get('terms') ?? '',
							type: [payloadTypes.enum.task]
						},
						url.searchParams.get('sort') ?? defaultSort,
						undefined,
						{ customCategoryKeys: categoryContext?.keys ?? [], includeFacets: true }
					),
					getManyContainersWithES(
						currentOrganization.payload.default ? [] : [currentOrganization.guid],
						{
							type: [payloadTypes.enum.goal]
						},
						'alpha',
						undefined,
						{ includeFacets: false }
					)
				]);
				taskContainers = taskResult.containers as TaskContainer[];
				otherContainers = otherResult.containers as GoalContainer[];
				data = taskResult.facets;
			} else {
				const [taskResult, otherResult] = await Promise.all([
					locals.pool.connect(
						getManyContainers(
							currentOrganization.payload.default ? [] : [currentOrganization.guid],
							{
								assignees: url.searchParams.getAll('assignee'),
								customCategories,
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
				]);
				taskContainers = taskResult as TaskContainer[];
				otherContainers = otherResult as GoalContainer[];
			}
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
			['assignee', fromCounts([], data?.assignee)]
		]);

		if (useCustomCategories && categoryContext) {
			for (const [key, facetMap] of buildCategoryFacetsWithCounts(categoryContext.options)) {
				_facets.set(key, facetMap);
			}
		}

		const facets =
			features.useElasticsearch() && data
				? _facets
				: computeFacetCount(_facets, taskContainers, {
						useCategoryPayload: useCustomCategories
					});

		return { containers, relatedContainers, facets };
	}) satisfies PageServerLoad;
}
