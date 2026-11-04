import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterCategoryContext } from '$lib/categoryOptions';
import { type AnyPayload, type Container, payloadTypes } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { createContainerPageQuery } from '$lib/server/containerQuery';
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

export const load: PageServerLoad = async ({ depends, locals, parent, url }) => {
	depends('containers');

	const applicationContext = await parent();
	const { categoryContext, currentOrganization } = applicationContext;
	const queryContainerPage = await createContainerPageQuery(locals, applicationContext);

	const [facetData, columnEntries] = await Promise.all([
		queryContainerPage(createAllLevelQuery(url), { limit: 1, offset: 0 }),
		Promise.all(
			ALL_LEVEL_COLUMN_IDS.map(async (columnId) => {
				const data = await queryContainerPage(createAllLevelQuery(url, columnId), {
					limit: DEFAULT_PAGE_SIZE,
					offset: 0
				});

				return [columnId, { containers: data.containers, page: data.page }] as const;
			})
		)
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
				]),
		title: unwrapFunctionStore(_)('dots')
	};
};
