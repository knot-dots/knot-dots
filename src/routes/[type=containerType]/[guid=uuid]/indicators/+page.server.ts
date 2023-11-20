import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationalUnitContainer, isOrganizationContainer, payloadTypes } from '$lib/models';
import { getContainerByGuid, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isOrganizationContainer(container) && !isOrganizationalUnitContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const containers = await locals.pool.connect(
		getManyContainers(
			[container.organization],
			{
				...(isOrganizationalUnitContainer(container)
					? { organizationalUnits: [container.guid] }
					: undefined),
				type: [payloadTypes.enum.indicator]
			},
			''
		)
	);

	return { container, containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
