import { loadColumnBoardPage } from '$lib/load/columnBoard';
import {
	type ProgramContainer,
	type ProgramStatus,
	payloadTypes,
	programStatus
} from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createStrategyStatusQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<ProgramContainer, ProgramStatus>({
	createQuery: createStrategyStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => programStatus.options,
	limit: DEFAULT_PAGE_SIZE,
	payloadTypes: [payloadTypes.enum.program]
}) satisfies PageServerLoad;
