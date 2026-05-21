<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import createColumnBoardPagination from '$lib/client/createColumnBoardPagination.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import RulesPage from '$lib/components/RulesPage.svelte';
	import { type RuleContainer, type RuleStatus } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import { ruleStatusBackgrounds, ruleStatusHoverColors } from '$lib/theme/models';
	import { createRuleStatusQuery } from './query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const board = createColumnBoardPagination<RuleContainer, RuleStatus>({
		columnForItem: ({ payload }) => payload.ruleStatus,
		columnIds: () => data.columnIds,
		columns: () => data.columns,
		created: () => $lastCreatedContainer,
		fetchPage: async ({ columnId, offset, signal }) => {
			const result = await fetchContainerPage<RuleContainer>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: createRuleStatusQuery(page.url, columnId),
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

<RulesPage facets={data.facets}>
	<Board>
		{#each data.columnIds as statusOption (statusOption)}
			<BoardColumn
				--background={ruleStatusBackgrounds.get(statusOption)}
				--hover-border-color={ruleStatusHoverColors.get(statusOption)}
				addItemUrl={`#create=rule&ruleStatus=${statusOption}`}
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
	<Help slug="rules-status" />
</RulesPage>
