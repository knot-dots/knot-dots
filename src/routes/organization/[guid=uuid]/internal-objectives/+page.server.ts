import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationContainer, payloadTypes, predicates } from '$lib/models';
import {
	getAllRelatedInternalObjectives,
	getContainerByGuid,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	let containers;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isOrganizationContainer(container)) {
		throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedInternalObjectives(
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relations').length == 0
					? ['hierarchical', 'other']
					: url.searchParams.getAll('relations'),
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				[container.organization],
				{
					terms: url.searchParams.get('terms') ?? '',
					type: [
						payloadTypes.enum['internal_objective.internal_strategy'],
						payloadTypes.enum['internal_objective.milestone'],
						payloadTypes.enum['internal_objective.strategic_goal'],
						payloadTypes.enum['internal_objective.task'],
						payloadTypes.enum['internal_objective.vision']
					]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	containers = containers.filter(({ relation, organizational_unit }) => {
		if (
			!url.searchParams.getAll('included').includes('is-part-of-measure') &&
			relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
		) {
			return false;
		}

		if (
			!url.searchParams.getAll('included').includes('subordinate-organizational-units') &&
			organizational_unit
		) {
			return false;
		}

		return true;
	});

	return { container, containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
