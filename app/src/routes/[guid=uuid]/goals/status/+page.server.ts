import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type GoalContainer, goalStatus, type GoalStatus, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createGoalStatusQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<GoalContainer, GoalStatus>({
	createQuery: createGoalStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => goalStatus.options,
	limit: DEFAULT_PAGE_SIZE,
	payloadTypes: [payloadTypes.enum.goal]
}) satisfies PageServerLoad;
