<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import createColumnBoardPagination from '$lib/client/createColumnBoardPagination.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import { type Container, type ProgramPayload, type Status } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainer, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';
	import { createSetOfRulesStatusQuery } from './query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const board = createColumnBoardPagination<Container<ProgramPayload>, Status>({
		columnForItem: ({ payload }) => payload.status,
		columnIds: () => data.columnIds,
		columns: () => data.columns,
		created: () => $lastCreatedContainer,
		deleted: () => $lastDeletedContainers,
		fetchPage: async ({ columnId, offset, signal }) => {
			const result = await fetchContainerPage<Container<ProgramPayload>>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: createSetOfRulesStatusQuery(page.url, columnId),
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

<ProgramsPage facets={data.facets}>
	<Board>
		{#each data.columnIds as statusOption (statusOption)}
			<BoardColumn
				--background={statusBackgrounds.get(statusOption)}
				--hover-border-color={statusHoverColors.get(statusOption)}
				addItemUrl={`#create=program&status=${statusOption}`}
				title={statusOption === 'status.in_operation'
					? $_('status.in_application')
					: $_(statusOption)}
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
	<ContextTabs slug="set-of-rules-status" />
</ProgramsPage>
