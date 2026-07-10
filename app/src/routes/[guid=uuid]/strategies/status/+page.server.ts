import { loadColumnBoardPage } from '$lib/load/columnBoard';
import {
	type Container,
	payloadTypes,
	type ProgramPayload,
	type Status,
	status
} from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createStrategyStatusQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<Container<ProgramPayload>, Status>({
	createQuery: createStrategyStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options,
	limit: DEFAULT_PAGE_SIZE,
	omitStatusFacet: true,
	payloadTypes: [payloadTypes.enum.program]
}) satisfies PageServerLoad;
