import { loadColumnBoardPage } from '$lib/load/columnBoard';
import {
	type Container,
	payloadTypes,
	type ProgramPayload,
	type Status,
	status
} from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import {
	createSetOfRulesStatusQuery,
	DEFAULT_RELATION_TYPES,
	setOfRulesStatusColumnGroup
} from './query';
import type { PageLoad } from './$types';

export const load = loadColumnBoardPage<Container<ProgramPayload>, Status>({
	columnGroup: setOfRulesStatusColumnGroup,
	createQuery: createSetOfRulesStatusQuery,
	defaultRelationTypes: DEFAULT_RELATION_TYPES,
	getColumnIds: () => status.options,
	limit: DEFAULT_PAGE_SIZE,
	omitStatusFacet: true,
	payloadTypes: [payloadTypes.enum.program]
}) satisfies PageLoad;
