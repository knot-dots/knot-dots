import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerGroups from '$lib/client/fetchContainerGroups';
import { type AnyPayload, type Container, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import {
	ALL_LEVEL_COLUMN_IDS,
	type AllLevelColumnId,
	allLevelColumnGroup,
	createAllLevelQuery,
	DEFAULT_RELATION_TYPES
} from './query';
import type { PageLoad } from './$types';

type Column = {
	containers: Container<AnyPayload>[];
	page: {
		hasMore: boolean;
		limit: number;
		nextOffset: number | null;
		offset: number;
		total: number;
	};
};

const ALL_LEVEL_PAYLOAD_TYPES = [
	payloadTypes.enum.goal,
	payloadTypes.enum.measure,
	payloadTypes.enum.program,
	payloadTypes.enum.report,
	payloadTypes.enum.rule,
	payloadTypes.enum.simple_measure
];

export const load: PageLoad = async ({ depends, fetch, params, parent, url }) => {
	depends('app:containers');

	const [{ facets, groups }, { categoryContext, currentOrganization }] = await Promise.all([
		fetchContainerGroups<Container<AnyPayload>>({
			contextGuid: params.guid,
			fetch,
			groups: ALL_LEVEL_COLUMN_IDS.map(allLevelColumnGroup),
			limit: DEFAULT_PAGE_SIZE,
			query: createAllLevelQuery(url)
		}),
		parent()
	]);

	const columns = Object.fromEntries(
		ALL_LEVEL_COLUMN_IDS.map((columnId, index) => [columnId, groups[index]])
	) as Record<AllLevelColumnId, Column>;
	const filteredCategoryContext = filterCategoryContext(categoryContext, ALL_LEVEL_PAYLOAD_TYPES, {
		matchAll: true
	});

	return {
		columnIds: ALL_LEVEL_COLUMN_IDS,
		columns,
		containers: Object.values(columns).flatMap(({ containers }) => containers),
		facets: url.searchParams.has('related-to')
			? new Map([['relationType', new Map(DEFAULT_RELATION_TYPES.map((rt) => [rt, 0]))]])
			: new Map([
					...((!currentOrganization.payload.default
						? [['included', new Map<string, number>()]]
						: []) as Array<[string, Map<string, number>]>),
					['status', facets.get('status') ?? new Map()],
					...[...facets].filter(([key]) => filteredCategoryContext.keys.includes(key)),
					['programType', facets.get('programType') ?? new Map()]
				]),
		title: unwrapFunctionStore(_)('dots')
	};
};
