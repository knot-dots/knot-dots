import { env } from '$env/dynamic/public';
import { payloadTypes } from '$lib/models';
import type {
	Container,
	EmptyMeasureContainer,
	EmptyModelContainer,
	EmptyOperationalGoalContainer,
	EmptyStrategicGoalContainer,
	Indicator,
	PartialRelation,
	PayloadType,
	SustainableDevelopmentGoal,
	Topic
} from '$lib/models';
import { getAllRelatedContainers, getContainerByGuid, maybePartOf } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, url }) => {
	let strategyOverlayData;

	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	const relatedContainers = await locals.pool.connect(getAllRelatedContainers(params.guid, {}, ''));

	if (url.searchParams.has('edit')) {
		const selectedContainer = relatedContainers.find(
			(c) => url.searchParams.get('edit') == c.guid
		) as Container;
		const isPartOfOptions = await locals.pool.connect(maybePartOf(selectedContainer.payload.type));
		strategyOverlayData = {
			container: selectedContainer,
			isPartOfOptions
		};
	}

	return {
		container,
		relatedContainers,
		...(strategyOverlayData ? { strategyOverlayData } : undefined)
	};
}) satisfies PageServerLoad;
