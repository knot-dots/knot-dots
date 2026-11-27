import { filterCategoryContext, type CategoryContext } from '$lib/categoryOptions';
import fetchContainerGroups from '$lib/client/fetchContainerGroups';
import type { ContainerGroup } from '$lib/containerGroups';
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
	columnGroup: (columnId: ColumnId) => ContainerGroup;
	createQuery: (url: URL) => URLSearchParams;
	defaultRelationTypes: string[];
	facetKeys?: readonly string[];
	getColumnIds: (context: { url: URL }) => Promise<readonly ColumnId[]> | readonly ColumnId[];
	limit: number;
	omitStatusFacet?: boolean;
	payloadTypes: PayloadType[];
}

interface ColumnBoardLoadEvent {
	depends: (...dependencies: `${string}:${string}`[]) => void;
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
		depends('app:containers');

		const columnIds = await options.getColumnIds({ url });
		const [{ facets, groups }, { categoryContext, currentOrganization }] = await Promise.all([
			fetchContainerGroups<T>({
				contextGuid: params.guid,
				fetch,
				groups: columnIds.map(options.columnGroup),
				limit: options.limit,
				query: options.createQuery(url)
			}),
			parent()
		]);

		const columns = Object.fromEntries(
			columnIds.map((columnId, index) => [columnId, groups[index]])
		) as Record<ColumnId, Column<T>>;
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
							: [['status', facets.get('status') ?? new Map()]]) as Array<
							[string, Map<string, number>]
						>),
						...[...facets].filter(([key]) =>
							[...filteredCategoryContext.keys, ...(options.facetKeys ?? [])].includes(key)
						)
					])
		};
	};
}
