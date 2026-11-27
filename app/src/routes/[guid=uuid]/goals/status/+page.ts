import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type Container, type GoalPayload, payloadTypes, type Status, status } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createGoalStatusQuery, DEFAULT_RELATION_TYPES, goalStatusColumnGroup } from './query';
import type { PageLoad } from './$types';

export const load = loadColumnBoardPage<Container<GoalPayload>, Status>({
	columnGroup: goalStatusColumnGroup,
	createQuery: createGoalStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options.filter((s) => s !== 'status.in_operation'),
	limit: DEFAULT_PAGE_SIZE,
	omitStatusFacet: true,
	payloadTypes: [payloadTypes.enum.goal]
}) satisfies PageLoad;
