import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import {
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyTaskContainers
} from '$lib/server/db';
import { isOrganizationalUnitContainer, predicates } from '$lib/models';
import { filterVisible } from '$lib/authorization';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	let organizationalUnits: string[] = [];

	if (!isOrganizationalUnitContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const relatedOrganizationalUnits = await locals.pool.connect(
		getAllRelatedOrganizationalUnitContainers(container.guid)
	);
	organizationalUnits = relatedOrganizationalUnits
		.filter(({ payload }) => payload.level >= container.payload.level)
		.map(({ guid }) => guid);

	let containers = await locals.pool.connect(
		getManyTaskContainers({
			organizationalUnits,
			taskCategories: url.searchParams.getAll('taskCategory'),
			terms: url.searchParams.get('terms') ?? ''
		})
	);

	containers = containers.filter(({ relation, organizational_unit }) => {
		if (
			!url.searchParams.getAll('included').includes('is-part-of-measure') &&
			relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
		) {
			return false;
		}

		if (
			!url.searchParams.getAll('included').includes('subordinate-organizational-units') &&
			organizational_unit != container.guid
		) {
			return false;
		}

		return true;
	});

	return { container, containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
