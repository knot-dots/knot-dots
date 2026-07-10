import createPaginatedList from '$lib/client/createPaginatedList.svelte';
import withOptimistic from '$lib/client/withOptimistic';
import type { AnyPayload, Container } from '$lib/models';

type Column<T extends Container<AnyPayload>> = {
	containers: T[];
	page: { hasMore: boolean };
};

export default function createColumnBoardPagination<
	T extends Container<AnyPayload>,
	ColumnId extends string
>({
	columnIds,
	columnForItem,
	columns,
	created,
	deleted,
	fetchPage,
	pageSize,
	resetKey,
	updated
}: {
	columnForItem: (container: T) => ColumnId;
	columnIds: () => readonly ColumnId[];
	columns: () => Record<ColumnId, Column<T>>;
	created: () => Container<AnyPayload> | undefined;
	deleted: () => Map<string, Container<AnyPayload>>;
	fetchPage: (params: { columnId: ColumnId; offset: number; signal: AbortSignal }) => Promise<{
		hasMore: boolean;
		items: T[];
		nextOffset?: number | null;
	}>;
	pageSize: number;
	resetKey: () => string;
	updated: () => Map<string, Container<AnyPayload>>;
}) {
	const initialItemsKey = $derived(
		columnIds()
			.map(
				(columnId) =>
					`${columnId}:${columns()
						[columnId].containers.map(({ guid }) => guid)
						.join(',')}`
			)
			.join('|')
	);
	const fullResetKey = $derived(`${resetKey()}|${initialItemsKey}`);

	const lists = new Map(
		columnIds().map((columnId) => [
			columnId,
			createPaginatedList<T>({
				fetchPage: ({ offset, signal }) => fetchPage({ columnId, offset, signal }),
				getKey: ({ guid }) => guid,
				initialHasMore: () => columns()[columnId].page.hasMore,
				initialItems: () => columns()[columnId].containers,
				pageSize,
				resetKey: () => `${fullResetKey}|${columnId}`
			})
		])
	);

	const loadedItems = $derived(columnIds().flatMap((columnId) => lists.get(columnId)?.items ?? []));
	const items = $derived(
		dedupeByGuid(withOptimistic(loadedItems, created(), deleted(), updated()))
	);

	return {
		itemsByColumn(columnId: ColumnId) {
			return items.filter((item) => columnForItem(item) === columnId);
		},
		listByColumn(columnId: ColumnId) {
			return lists.get(columnId);
		},
		get items() {
			return items;
		}
	};
}

function dedupeByGuid<T extends Container<AnyPayload>>(containers: T[]) {
	const byGuid = new Map<string, T>();
	for (const container of containers) {
		byGuid.set(container.guid, container);
	}
	return [...byGuid.values()];
}
