import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationContainer, payloadTypes } from '$lib/models';
import { getContainerByGuid, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isOrganizationContainer(container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const [strategies, measures, indicators] = await Promise.all([
		locals.pool.connect(
			getManyContainers([container.guid], { type: [payloadTypes.enum.strategy] }, '')
		),
		locals.pool.connect(
			getManyContainers([container.guid], { type: [payloadTypes.enum.measure] }, '')
		),
		locals.pool.connect(
			getManyContainers([container.guid], { type: [payloadTypes.enum.indicator] }, '')
		)
	]);

	return {
		container,
		indicators: filterVisible(indicators, locals.user),
		measures: filterVisible(measures, locals.user),
		strategies: filterVisible(strategies, locals.user)
	};
}) satisfies PageServerLoad;
