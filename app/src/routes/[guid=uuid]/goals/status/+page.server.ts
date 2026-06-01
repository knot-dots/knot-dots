import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type GoalContainer, status, type Status, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createGoalStatusQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<GoalContainer, Status>({
	createQuery: createGoalStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options.filter((s) => s !== 'status.in_operation'),
	limit: DEFAULT_PAGE_SIZE,
	omitStatusFacet: true,
	payloadTypes: [payloadTypes.enum.goal]
}) satisfies PageServerLoad;
