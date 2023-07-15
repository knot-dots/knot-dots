import { env } from '$env/dynamic/public';
import { payloadTypes } from '$lib/models';
import type {
	Container,
	EmptyMeasureContainer,
	EmptyModelContainer,
	EmptyOperationalGoalContainer,
	EmptyStrategicGoalContainer,
	EmptyTextContainer,
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
	} else if (url.searchParams.has('new')) {
		const selected = url.searchParams
			.getAll('is-part-of')
			.map((o): PartialRelation => ({ object: Number(o), predicate: 'is-part-of' }));
		const newContainer = ((type: PayloadType) => {
			const base = { realm: env.PUBLIC_KC_REALM, relation: selected, user: [] };
			const category: SustainableDevelopmentGoal[] = [];
			const indicator: Indicator[] = [];
			const topic: Topic[] = [];
			switch (type) {
				case payloadTypes.enum.measure:
					return { ...base, payload: { category, topic, type } } as EmptyMeasureContainer;
				case payloadTypes.enum.model:
					return { ...base, payload: { category, topic, type } } as EmptyModelContainer;
				case payloadTypes.enum.operational_goal:
					return {
						...base,
						payload: { category, indicator, topic, type }
					} as EmptyOperationalGoalContainer;
				case payloadTypes.enum.strategic_goal:
					return { ...base, payload: { category, topic, type } } as EmptyStrategicGoalContainer;
				default:
					return { ...base, payload: { type } } as EmptyTextContainer;
			}
		})(url.searchParams.get('new') as PayloadType);
		const isPartOfOptions = await locals.pool.connect(
			maybePartOf(url.searchParams.get('new') as PayloadType)
		);
		strategyOverlayData = {
			container: newContainer,
			isPartOfOptions
		};
	}

	return {
		container,
		relatedContainers,
		...(strategyOverlayData ? { strategyOverlayData } : undefined)
	};
}) satisfies PageServerLoad;
