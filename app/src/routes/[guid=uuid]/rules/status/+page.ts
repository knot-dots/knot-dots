import { loadColumnBoardPage } from '$lib/load/columnBoard';
import { type Container, payloadTypes, type RulePayload, type Status, status } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createRuleStatusQuery, DEFAULT_RELATION_TYPES, ruleStatusColumnGroup } from './query';
import type { PageLoad } from './$types';

export const load = loadColumnBoardPage<Container<RulePayload>, Status>({
	columnGroup: ruleStatusColumnGroup,
	createQuery: createRuleStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options,
	limit: DEFAULT_PAGE_SIZE,
	omitStatusFacet: true,
	payloadTypes: [payloadTypes.enum.rule]
}) satisfies PageLoad;
