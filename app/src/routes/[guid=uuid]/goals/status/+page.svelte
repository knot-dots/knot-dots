<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import createColumnBoardPagination from '$lib/client/createColumnBoardPagination.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { type GoalContainer, type GoalStatus } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import { goalStatusBackgrounds, goalStatusHoverColors } from '$lib/theme/models';
	import { createGoalStatusQuery } from './query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const board = createColumnBoardPagination<GoalContainer, GoalStatus>({
		columnForItem: ({ payload }) => payload.goalStatus,
		columnIds: () => data.columnIds,
		columns: () => data.columns,
		created: () => $lastCreatedContainer,
		fetchPage: async ({ columnId, offset, signal }) => {
			const result = await fetchContainerPage<GoalContainer>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: createGoalStatusQuery(page.url, columnId),
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
</script>

<GoalsPage facets={data.facets}>
	<Board>
		{#each data.columnIds as statusOption (statusOption)}
			<BoardColumn
				--background={goalStatusBackgrounds.get(statusOption)}
				--hover-border-color={goalStatusHoverColors.get(statusOption)}
				addItemUrl={`#create=goal&goalStatus=${statusOption}`}
				title={$_(statusOption)}
			>
				<MaybeDragZone containers={board.itemsByColumn(statusOption)}>
					{#snippet footer()}
						{@const list = board.listByColumn(statusOption)}
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
	<Help slug="goals-status" />
</GoalsPage>
