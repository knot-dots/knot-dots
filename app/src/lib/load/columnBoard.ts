import { filterCategoryContext, type CategoryContext } from '$lib/categoryOptions';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import type { AnyPayload, Container, PayloadType } from '$lib/models';

type Column<T extends Container<AnyPayload>> = {
	containers: T[];
	page: {
		hasMore: boolean;
		limit: number;
		nextOffset: number | null;
		offset: number;
		total: number;
	};
};

interface LoadColumnBoardOptions<ColumnId extends string> {
	createQuery: (url: URL, columnId?: ColumnId) => URLSearchParams;
	defaultRelationTypes: string[];
	facetKeys?: readonly string[];
	getColumnIds: (context: { url: URL }) => Promise<readonly ColumnId[]> | readonly ColumnId[];
	limit: number;
	omitStatusFacet?: boolean;
	payloadTypes: PayloadType[];
}

interface ColumnBoardLoadEvent {
	depends: (dependency: string) => void;
	fetch: typeof fetch;
	params: { guid: string };
	parent: () => Promise<{
		categoryContext: CategoryContext;
		currentOrganization: { payload: { default: boolean } };
	}>;
	url: URL;
}

export function loadColumnBoardPage<T extends Container<AnyPayload>, ColumnId extends string>(
	options: LoadColumnBoardOptions<ColumnId>
) {
	return async ({ depends, fetch, params, parent, url }: ColumnBoardLoadEvent) => {
		depends('containers');

		const columnIds = await options.getColumnIds({ url });
		const baseQuery = options.createQuery(url);
		const [facetData, columnEntries, { categoryContext, currentOrganization }] = await Promise.all([
			fetchContainerPage<T>({
				contextGuid: params.guid,
				fetch,
				limit: 1,
				offset: 0,
				query: baseQuery
			}),
			Promise.all(
				columnIds.map(async (columnId) => {
					const data = await fetchContainerPage<T>({
						contextGuid: params.guid,
						fetch,
						limit: options.limit,
						offset: 0,
						query: options.createQuery(url, columnId)
					});

					return [columnId, { containers: data.containers, page: data.page }] as const;
				})
			),
			parent()
		]);

		const columns = Object.fromEntries(columnEntries) as unknown as Record<ColumnId, Column<T>>;
		const columnValues = Object.values(columns) as Column<T>[];
		const filteredCategoryContext = filterCategoryContext(categoryContext, options.payloadTypes);

		return {
			columnIds,
			columns,
			containers: columnValues.flatMap(({ containers }) => containers),
			facets: url.searchParams.has('related-to')
				? new Map([
						[
							'relationType',
							new Map(options.defaultRelationTypes.map((relationType) => [relationType, 0]))
						]
					])
				: new Map([
						...((!currentOrganization.payload.default
							? [['included', new Map<string, number>()]]
							: []) as Array<[string, Map<string, number>]>),
						...((options.omitStatusFacet
							? []
							: [['status', facetData.facets.get('status') ?? new Map()]]) as Array<
							[string, Map<string, number>]
						>),
						...[...facetData.facets].filter(([key]) =>
							[...filteredCategoryContext.keys, ...(options.facetKeys ?? [])].includes(key)
						)
					])
		};
	};
}
