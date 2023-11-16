import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import type { PageServerLoad } from './$types';
import { hasMember, payloadTypes } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import { filterVisible } from '$lib/authorization';

export const load = (async ({ locals, parent }) => {
	if (!locals.user.isAuthenticated) {
		throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	const { organizations: allOrganizations, organizationalUnits: allOrganizationalUnits } =
		await parent();

	const organizations = allOrganizations.filter(hasMember(locals.user));
	const organizationalUnits = allOrganizationalUnits.filter(hasMember(locals.user));

	const containers = await locals.pool.connect(
		getManyContainers(
			organizations.map(({ guid }) => guid),
			{
				organizationalUnits: organizationalUnits.map(({ guid }) => guid),
				type: [
					payloadTypes.enum.measure,
					payloadTypes.enum.strategy,
					payloadTypes.enum['internal_objective.task']
				]
			},
			''
		)
	);

	return {
		containers: filterVisible(containers, locals.user),
		organizations,
		organizationalUnits
	};
}) satisfies PageServerLoad;
