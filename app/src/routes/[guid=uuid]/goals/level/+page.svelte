<script lang="ts">
	import { page } from '$app/state';
	import createColumnBoardPagination from '$lib/client/createColumnBoardPagination.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { type GoalContainer, titleForGoalCollection } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainer, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import { createGoalLevelQuery } from './query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const board = createColumnBoardPagination<GoalContainer, string>({
		columnForItem: ({ payload }) => String(payload.hierarchyLevel),
		columnIds: () => data.columnIds,
		columns: () => data.columns,
		created: () => $lastCreatedContainer,
		deleted: () => $lastDeletedContainers,
		fetchPage: async ({ columnId, offset, signal }) => {
			const result = await fetchContainerPage<GoalContainer>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: createGoalLevelQuery(page.url, columnId),
				signal
			});
			return {
				hasMore: result.page.hasMore,
				items: result.containers,
				nextOffset: result.page.nextOffset
			};
		},
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
	<Help slug="goals-level" />
</GoalsPage>
