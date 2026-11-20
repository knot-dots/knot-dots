import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type Container, type GoalPayload, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createGoalLevelQuery, DEFAULT_RELATION_TYPES, goalLevelColumnGroup } from './query';
import type { PageLoad } from './$types';

const HIERARCHY_LEVELS = ['1', '2', '3', '4', '5', '6'] as const;

export const load = loadColumnBoardPage<Container<GoalPayload>, string>({
	columnGroup: goalLevelColumnGroup,
	createQuery: createGoalLevelQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => HIERARCHY_LEVELS,
	limit: DEFAULT_PAGE_SIZE,
	payloadTypes: [payloadTypes.enum.goal]
}) satisfies PageLoad;
