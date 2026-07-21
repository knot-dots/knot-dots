<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Help from '$lib/components/Help.svelte';
	import KnowledgePage from '$lib/components/KnowledgePage.svelte';
	import Table from '$lib/components/Table.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import { type Container, type KnowledgePayload, payloadTypes } from '$lib/models';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';

	let { data }: PageProps = $props();

	const initialItemsKey = $derived(data.containers.map(({ guid }) => guid).join(','));
	const resetKey = $derived(
		`${page.url.pathname}?${page.url.searchParams.toString()}|${initialItemsKey}`
	);
	const list = createPaginatedList<Container<KnowledgePayload>>({
		fetchPage: async ({ offset, signal }) => {
			const result = await fetchContainerPage<Container<KnowledgePayload>>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: new URLSearchParams([
					...page.url.searchParams,
					['payloadType', payloadTypes.enum.knowledge]
				]),
				signal
			});

			return {
				hasMore: result.page.hasMore,
				items: result.containers,
				nextOffset: result.page.nextOffset
			};
		},
		getKey: ({ guid }) => guid,
		initialHasMore: () => data.page.hasMore,
		initialItems: () => data.containers as Container<KnowledgePayload>[],
		pageSize: DEFAULT_PAGE_SIZE,
		resetKey: () => resetKey
	});

	let containers = $derived(
		withOptimistic(
			list.items,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

	const customCategoryColumns = $derived(
		page.data.categoryContext.keys
			.filter((key) => data.facets.has(key))
			.map((key) => ({
				heading: page.data.categoryContext.labels.get(key) ?? key,
				key
			}))
	);

	const columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		...customCategoryColumns,
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
	]);
</script>

<KnowledgePage data={{ ...data, containers }}>
	<Table {columns} rows={containers}>
		{#snippet footer()}
			<LazyLoadSentinel
				hasMore={list.hasMore}
				loading={list.loadingMore}
				onLoadMore={list.loadMore}
			/>
		{/snippet}
	</Table>
	<Help slug="knowledge-table" />
</KnowledgePage>
