import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type Container, payloadTypes, type RulePayload, type Status, status } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createRuleStatusQuery, DEFAULT_RELATION_TYPES } from './query';
import type { PageServerLoad } from './$types';

export const load = loadColumnBoardPage<Container<RulePayload>, Status>({
	createQuery: createRuleStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options,
	limit: DEFAULT_PAGE_SIZE,
	omitStatusFacet: true,
	payloadTypes: [payloadTypes.enum.rule]
}) satisfies PageServerLoad;
