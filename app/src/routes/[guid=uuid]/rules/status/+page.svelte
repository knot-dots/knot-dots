<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import createColumnBoardPagination from '$lib/client/createColumnBoardPagination.svelte';
	import fetchContainerGroupPage from '$lib/client/fetchContainerGroupPage';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import RulesPage from '$lib/components/RulesPage.svelte';
	import { type Container, type RulePayload, type Status } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';
	import { createRuleStatusQuery, ruleStatusColumnGroup } from './query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const board = createColumnBoardPagination<Container<RulePayload>, Status>({
		columnForItem: ({ payload }) => payload.status,
		columnIds: () => data.columnIds,
		columns: () => data.columns,
		created: () => $lastCreatedContainers,
		deleted: () => $lastDeletedContainers,
		fetchPage: ({ columnId, offset, signal }) =>
			fetchContainerGroupPage<Container<RulePayload>>({
				contextGuid: page.params.guid,
				fetch,
				group: ruleStatusColumnGroup(columnId),
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: createRuleStatusQuery(page.url),
				signal
			}),
		pageSize: DEFAULT_PAGE_SIZE,
		resetKey: () => `${page.url.pathname}?${page.url.searchParams.toString()}`,
		updated: () => $lastUpdatedContainers
	});
</script>

<RulesPage facets={data.facets}>
	<Board>
		{#each data.columnIds as statusOption (statusOption)}
			<BoardColumn
				--background={statusBackgrounds.get(statusOption)}
				--hover-border-color={statusHoverColors.get(statusOption)}
				addItemUrl={`#create=rule&status=${statusOption}`}
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
	<ContextTabs slug="rules-status" />
</RulesPage>
