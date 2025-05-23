import { filterVisible } from '$lib/authorization';
import { type IndicatorContainer, payloadTypes } from '$lib/models';
import { getAllContainersRelatedToIndicators, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ url, locals, parent }) => {
	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const container = currentOrganizationalUnit ?? currentOrganization;

	const [strategies, measures, indicators] = await Promise.all([
		locals.pool.connect(
			getManyContainers([container.guid], { type: [payloadTypes.enum.strategy] }, '')
		),
		locals.pool.connect(
			getManyContainers(
				[container.guid],
				{ type: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure] },
				''
			)
		),
		locals.pool.connect(
			getManyContainers([container.guid], { type: [payloadTypes.enum.indicator] }, '')
		)
	]);

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(indicators as IndicatorContainer[], {})
	);

	return {
		container,
		indicators: filterVisible(indicators, locals.user),
		containersRelatedToIndicators: filterVisible(relatedContainers, locals.user),
		measures: filterVisible(measures, locals.user),
		strategies: filterVisible(strategies, locals.user)
	};
}) satisfies PageServerLoad;
