<script lang="ts">
	import { page } from '$app/state';
	import createColumnBoardPagination from '$lib/client/createColumnBoardPagination.svelte';
	import fetchContainerGroupPage from '$lib/client/fetchContainerGroupPage';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { type Container, type GoalPayload, titleForGoalCollection } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import { createGoalLevelQuery, goalLevelColumnGroup } from './query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const board = createColumnBoardPagination<Container<GoalPayload>, string>({
		columnForItem: ({ payload }) => String(payload.hierarchyLevel),
		columnIds: () => data.columnIds,
		columns: () => data.columns,
		created: () => $lastCreatedContainers,
		deleted: () => $lastDeletedContainers,
		fetchPage: ({ columnId, offset, signal }) =>
			fetchContainerGroupPage<Container<GoalPayload>>({
				contextGuid: page.params.guid,
				fetch,
				group: goalLevelColumnGroup(columnId),
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: createGoalLevelQuery(page.url),
				signal
			}),
		pageSize: DEFAULT_PAGE_SIZE,
		resetKey: () => `${page.url.pathname}?${page.url.searchParams.toString()}`,
		updated: () => $lastUpdatedContainers
	});

	let columnIds = $derived(
		data.columnIds.filter(
			(columnId) =>
				columnId === '1' ||
				data.columns[columnId].page.total > 0 ||
				board.itemsByColumn(columnId).length > 0
		)
	);
</script>

<GoalsPage facets={data.facets}>
	<Board>
		{#each columnIds as columnId (columnId)}
			{@const containers = board.itemsByColumn(columnId)}
			<BoardColumn
				addItemUrl={`#create=goal&hierarchyLevel=${columnId}`}
				title={titleForGoalCollection(containers, columnIds.length > 1 ? Number(columnId) : 0)}
			>
				<MaybeDragZone {containers}>
					{#snippet footer()}
						{@const list = board.listByColumn(columnId)}
						{#if list}
							<LazyLoadSentinel
								hasMore={list.hasMore}
								loading={list.loadingMore}
								onLoadMore={list.loadMore}
							/>
						{/if}
					{/snippet}
				</MaybeDragZone>
			</BoardColumn>
		{/each}
	</Board>
	<ContextTabs slug="goals-level" />
</GoalsPage>
