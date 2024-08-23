import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationalUnitContainer, payloadTypes } from '$lib/models';
import {
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isOrganizationalUnitContainer(container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const relatedOrganizationalUnits = await locals.pool.connect(
		getAllRelatedOrganizationalUnitContainers(container.guid)
	);
	const organizationalUnits = relatedOrganizationalUnits
		.filter(({ payload }) => payload.level >= container.payload.level)
		.map(({ guid }) => guid);
	const [strategies, measures, indicators] = await Promise.all([
		locals.pool.connect(
			getManyContainers(
				[container.organization],
				{ organizationalUnits, type: [payloadTypes.enum.strategy] },
				''
			)
		),
		locals.pool.connect(
			getManyContainers(
				[container.organization],
				{ organizationalUnits, type: [payloadTypes.enum.measure] },
				''
			)
		),
		locals.pool.connect(
			getManyContainers(
				[container.organization],
				{ organizationalUnits, type: [payloadTypes.enum.indicator] },
				''
			)
		)
	]);

	return {
		container,
		indicators: filterVisible(indicators, locals.user),
		measures: filterVisible(measures, locals.user),
		strategies: filterVisible(strategies, locals.user)
	};
}) satisfies PageServerLoad;
