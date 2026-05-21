import { loadColumnBoardPage } from '$lib/load/columnBoard';
import {
	type MeasureContainer,
	type SimpleMeasureContainer,
	type Status,
	payloadTypes,
	status
} from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createMeasureStatusQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<MeasureContainer | SimpleMeasureContainer, Status>({
	createQuery: createMeasureStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options,
	limit: DEFAULT_PAGE_SIZE,
	payloadTypes: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
}) satisfies PageServerLoad;
