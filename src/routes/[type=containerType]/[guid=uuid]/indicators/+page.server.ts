import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationalUnitContainer, isOrganizationContainer, payloadTypes } from '$lib/models';
import {
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, parent, url }) => {
	let containers;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isOrganizationContainer(container) && !isOrganizationalUnitContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	if (url.searchParams.getAll('included').includes('all-organizational-units')) {
		containers = await locals.pool.connect(
			getManyContainers([container.organization], { type: [payloadTypes.enum.indicator] }, '')
		);
	} else {
		let organizationalUnits: string[] = [];
		const { currentOrganizationalUnit } = await parent();
		if (currentOrganizationalUnit) {
			const relatedOrganizationalUnits = await locals.pool.connect(
				getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
			);
			organizationalUnits = relatedOrganizationalUnits
				.filter(({ payload }) => payload.level >= currentOrganizationalUnit.payload.level)
				.map(({ guid }) => guid);
		}
		containers = await locals.pool.connect(
			getManyContainers(
				[container.organization],
				{
					organizationalUnits,
					type: [payloadTypes.enum.indicator]
				},
				''
			)
		);
	}

	return { container, containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
