import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import {
	type Container,
	filterOrganizationalUnits,
	isPartOf,
	isTaskContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

function filterRelated(containers: Container[], taskContainers: Container[]): Container[] {
	return containers.filter((c) => taskContainers.some(isPartOf(c)));
}

export const load = (async ({ locals, parent, url }) => {
	let taskContainers;
	let otherContainers;
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
				[predicates.enum['is-part-of']],
				{},
				url.searchParams.get('sort') ?? ''
			)
		);
		taskContainers = containers.filter(isTaskContainer);
		otherContainers = containers.filter((c) => !isTaskContainer(c));
	} else {
		[taskContainers, otherContainers] = await Promise.all([
			locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						assignees: url.searchParams.getAll('assignee'),
						taskCategories: url.searchParams.getAll('taskCategory'),
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.task]
					},
					'priority'
				)
			),
			locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						type: [
							payloadTypes.enum.measure_result,
							payloadTypes.enum.milestone,
							payloadTypes.enum.model,
							payloadTypes.enum.operational_goal,
							payloadTypes.enum.strategic_goal,
							payloadTypes.enum.vision
						]
					},
					'alpha'
				)
			)
		]);
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
