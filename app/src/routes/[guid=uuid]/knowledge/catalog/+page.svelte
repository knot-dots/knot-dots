<script lang="ts">
	import { page } from '$app/state';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import withOptimistic from '$lib/client/withOptimistic';
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import KnowledgePage from '$lib/components/KnowledgePage.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import { type KnowledgeContainer, payloadTypes } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initialItemsKey = $derived(data.containers.map(({ guid }) => guid).join(','));
	const resetKey = $derived(
		`${page.url.pathname}?${page.url.searchParams.toString()}|${initialItemsKey}`
	);
	const list = createPaginatedList<KnowledgeContainer>({
		fetchPage: async ({ offset, signal }) => {
			const result = await fetchContainerPage<KnowledgeContainer>({
				contextGuid: page.params.guid,
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
		initialHasMore: () => data.hasMore,
		initialItems: () => data.containers as KnowledgeContainer[],
		pageSize: DEFAULT_PAGE_SIZE,
		resetKey: () => resetKey
	});
	let containers = $derived(
		withOptimistic(list.items, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<KnowledgePage data={{ ...data, containers }} filterBarInitiallyOpen>
	<Catalog {containers} payloadType={[payloadTypes.enum.knowledge]}>
		{#snippet footer()}
			<LazyLoadSentinel
				hasMore={list.hasMore}
				loading={list.loadingMore}
				onLoadMore={list.loadMore}
			/>
		{/snippet}
	</Catalog>
	<Help slug="knowledge-catalog" />
</KnowledgePage>
