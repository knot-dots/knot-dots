<script lang="ts">
	import { page } from '$app/state';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import withOptimistic from '$lib/client/withOptimistic';
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import { type Container, type PagePayload, payloadTypes } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initialItemsKey = $derived(data.containers.map(({ guid }) => guid).join(','));

	const resetKey = $derived(
		`${page.url.pathname}?${page.url.searchParams.toString()}|${initialItemsKey}`
	);

	const list = createPaginatedList<Container<PagePayload>>({
		fetchPage: async ({ offset, signal }) => {
			const result = await fetchContainerPage<Container<PagePayload>>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: new URLSearchParams([
					...page.url.searchParams,
					['payloadType', payloadTypes.enum.page]
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
		initialItems: () => data.containers as Container<PagePayload>[],
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
</script>

<Layout>
	{#snippet header()}
		<Header />
	{/snippet}

	{#snippet main()}
		<Catalog {containers} payloadType={[payloadTypes.enum.page]}>
			{#snippet footer()}
				<LazyLoadSentinel
					hasMore={list.hasMore}
					loading={list.loadingMore}
					onLoadMore={list.loadMore}
				/>
			{/snippet}
		</Catalog>
	{/snippet}
</Layout>
