import { filterVisible } from '$lib/authorization';
import { type IndicatorContainer, isOrganizationalUnitContainer, payloadTypes } from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent }) => {
	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const container = currentOrganizationalUnit ?? currentOrganization;
	let organizationalUnits: string[] = [];

	if (isOrganizationalUnitContainer(container)) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(container.guid)
		);
		organizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > container.payload.level)
			.map(({ guid }) => guid)
			.concat(container.guid);
	}

	const [strategies, measures, indicators] = await Promise.all([
		locals.pool.connect(
			getManyContainers(
				'default' in container.payload && container.payload.default ? [] : [container.organization],
				{ organizationalUnits, type: [payloadTypes.enum.strategy] },
				''
			)
		),
		locals.pool.connect(
			getManyContainers(
				'default' in container.payload && container.payload.default ? [] : [container.organization],
				{
					organizationalUnits,
					type: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
				},
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

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(indicators as IndicatorContainer[], { organizationalUnits })
	);

	return {
		container,
		indicators: filterVisible(indicators, locals.user),
		containersRelatedToIndicators: filterVisible(relatedContainers, locals.user),
		measures: filterVisible(measures, locals.user),
		strategies: filterVisible(strategies, locals.user)
	};
}) satisfies PageServerLoad;
