import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type Level, levels, payloadTypes, type ProgramContainer } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createProgramLevelQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<ProgramContainer, Level>({
	createQuery: createProgramLevelQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	facetKeys: ['programType'],
	getColumnIds: () => levels.options.filter((l) => l !== levels.enum['level.regional']),
	limit: DEFAULT_PAGE_SIZE,
	payloadTypes: [payloadTypes.enum.program]
}) satisfies PageServerLoad;
