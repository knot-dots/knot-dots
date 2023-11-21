import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationalUnitContainer, isOrganizationContainer, payloadTypes } from '$lib/models';
import { getContainerByGuid, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	let containers;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isOrganizationContainer(container) && !isOrganizationalUnitContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const allIndicatorContainers = await locals.pool.connect(
		getManyContainers(
			[container.organization],
			{
				type: [payloadTypes.enum.indicator]
			},
			''
		)
	);

	if (url.searchParams.getAll('included').includes('all-organizational-units')) {
		containers = filterVisible(allIndicatorContainers, locals.user);
	} else {
		containers = filterVisible(
			allIndicatorContainers.filter(
				(c) =>
					(container.payload.type == payloadTypes.enum.organizational_unit &&
						c.organizational_unit == container.guid) ||
					(container.payload.type == payloadTypes.enum.organization &&
						c.organizational_unit == null)
			),
			locals.user
		);
	}

	return { container, containers };
}) satisfies PageServerLoad;
