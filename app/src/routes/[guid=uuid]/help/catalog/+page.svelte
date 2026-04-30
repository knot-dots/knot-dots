<script lang="ts">
	import { page } from '$app/state';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import withOptimistic from '$lib/client/withOptimistic';
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import HelpPage from '$lib/components/HelpPage.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import { type HelpContainer, payloadTypes } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initialItemsKey = $derived(data.containers.map(({ guid }) => guid).join(','));
	const resetKey = $derived(
		`${page.url.pathname}?${page.url.searchParams.toString()}|${initialItemsKey}`
	);
	const catalog = createPaginatedList<HelpContainer>({
		fetchPage: async ({ offset, signal }) => {
			const result = await fetchContainerPage<HelpContainer>({
				contextGuid: page.params.guid,
				filters: {
					payloadType: [payloadTypes.enum.help],
					terms: page.url.searchParams.get('terms') ?? undefined
				},
				limit: DEFAULT_PAGE_SIZE,
				offset,
				signal,
				sort: page.url.searchParams.get('sort') ?? undefined
			});

			return {
				hasMore: result.page.hasMore,
				items: result.containers,
				nextOffset: result.page.nextOffset
			};
		},
		getKey: ({ guid }) => guid,
		initialHasMore: () => data.hasMore,
		initialItems: () => data.containers as HelpContainer[],
		pageSize: DEFAULT_PAGE_SIZE,
		resetKey: () => resetKey
	});
	let containers = $derived(
		withOptimistic(catalog.items, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<HelpPage>
	<Catalog {containers} payloadType={[payloadTypes.enum.help]}>
		{#snippet footer()}
			<LazyLoadSentinel
				hasMore={catalog.hasMore}
				loading={catalog.loadingMore}
				onLoadMore={catalog.loadMore}
			/>
		{/snippet}
	</Catalog>
	<Help slug="help-catalog" />
</HelpPage>
