import { loadColumnBoardPage } from '$lib/load/columnBoard';
import {
	type Container,
	type MeasurePayload,
	payloadTypes,
	type SimpleMeasurePayload,
	type Status,
	status
} from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createMeasureStatusQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<Container<MeasurePayload | SimpleMeasurePayload>, Status>({
	createQuery: createMeasureStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options,
	limit: DEFAULT_PAGE_SIZE,
	omitStatusFacet: true,
	payloadTypes: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
}) satisfies PageServerLoad;
