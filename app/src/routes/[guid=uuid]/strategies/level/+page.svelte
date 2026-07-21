<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import createColumnBoardPagination from '$lib/client/createColumnBoardPagination.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { type Container, type Level, predicates, type ProgramPayload } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import { createStrategyLevelQuery } from './query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-superordinate-of']
		]
	});

	let facets = $derived(data.facets);

	const board = createColumnBoardPagination<Container<ProgramPayload>, Level>({
		columnForItem: ({ payload }) => payload.level,
		columnIds: () => data.columnIds,
		columns: () => data.columns,
		created: () => $lastCreatedContainers,
		deleted: () => $lastDeletedContainers,
		fetchPage: async ({ columnId, offset, signal }) => {
			const result = await fetchContainerPage<Container<ProgramPayload>>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: createStrategyLevelQuery(page.url, columnId),
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

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<Board>
			{#each data.columnIds as levelOption (levelOption)}
				<BoardColumn addItemUrl={`#create=program&level=${levelOption}`} title={$_(levelOption)}>
					<MaybeDragZone containers={board.itemsByColumn(levelOption)}>
						{#snippet footer()}
							{@const list = board.listByColumn(levelOption)}
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

		<Help slug="strategies-level" />
	{/snippet}
</Layout>
