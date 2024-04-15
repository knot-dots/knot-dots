import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { filterOrganizationalUnits } from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getManyTaskContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	let subordinateOrganizationalUnits: string[] = [];

	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganization.payload.default) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level >= currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	const containers = await locals.pool.connect(
		getManyTaskContainers({
			assignees: url.searchParams.getAll('assignee'),
			organization: currentOrganization.payload.default ? undefined : currentOrganization.guid,
			taskCategories: url.searchParams.getAll('taskCategory'),
			terms: url.searchParams.get('terms') ?? ''
		})
	);

	return {
		containers: filterOrganizationalUnits(
			filterVisible(containers, locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit
		)
	};
}) satisfies PageServerLoad;
