import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type RuleContainer, type Status, payloadTypes, status } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createRuleStatusQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<RuleContainer, Status>({
	createQuery: createRuleStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options,
	limit: DEFAULT_PAGE_SIZE,
	payloadTypes: [payloadTypes.enum.rule]
}) satisfies PageServerLoad;
