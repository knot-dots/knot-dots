import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type Container, type Level, levels, payloadTypes, type ProgramPayload } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createStrategyLevelQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<Container<ProgramPayload>, Level>({
	createQuery: createStrategyLevelQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => levels.options.filter((l) => l !== levels.enum['level.regional']),
	limit: DEFAULT_PAGE_SIZE,
	payloadTypes: [payloadTypes.enum.program]
}) satisfies PageServerLoad;
