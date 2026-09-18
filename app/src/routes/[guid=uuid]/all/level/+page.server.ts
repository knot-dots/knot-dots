import { filterCategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type AnyPayload, type Container, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import {
	ALL_LEVEL_COLUMN_IDS,
	type AllLevelColumnId,
	createAllLevelQuery,
	DEFAULT_RELATION_TYPES
} from './query';
import type { PageServerLoad } from './$types';

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

export const load: PageServerLoad = async ({ depends, fetch, params, parent, url }) => {
	depends('containers');

	const baseQuery = createAllLevelQuery(url);
	const [facetData, columnEntries, { categoryContext, currentOrganization }] = await Promise.all([
		fetchContainerPage<Container<AnyPayload>>({
			contextGuid: params.guid,
			fetch,
			limit: 1,
			offset: 0,
			query: baseQuery
		}),
		Promise.all(
			ALL_LEVEL_COLUMN_IDS.map(async (columnId) => {
				const data = await fetchContainerPage<Container<AnyPayload>>({
					contextGuid: params.guid,
					fetch,
					limit: DEFAULT_PAGE_SIZE,
					offset: 0,
					query: createAllLevelQuery(url, columnId)
				});

				return [columnId, { containers: data.containers, page: data.page }] as const;
			})
		),
		parent()
	]);

	const columns = Object.fromEntries(columnEntries) as Record<AllLevelColumnId, Column>;
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
					['status', facetData.facets.get('status') ?? new Map()],
					...[...facetData.facets].filter(([key]) => filteredCategoryContext.keys.includes(key)),
					['programType', facetData.facets.get('programType') ?? new Map()]
				])
	};
};
