<script lang="ts">
	import { page } from '$app/state';
	import AllPage from '$lib/components/AllPage.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import withOptimistic from '$lib/client/withOptimistic';
	import { type AnyPayload, type Container, payloadTypes } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainer, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initialItemsKey = $derived(data.containers.map(({ guid }) => guid).join(','));
	const resetKey = $derived(
		`${page.url.pathname}?${page.url.searchParams.toString()}|${initialItemsKey}`
	);
	const list = createPaginatedList<Container<AnyPayload>>({
		fetchPage: async ({ offset, signal }) => {
			const allTypeOptions = [
				payloadTypes.enum.event,
				payloadTypes.enum.goal,
				payloadTypes.enum.help,
				payloadTypes.enum.knowledge,
				payloadTypes.enum.measure,
				payloadTypes.enum.organizational_unit,
				payloadTypes.enum.page,
				payloadTypes.enum.post,
				payloadTypes.enum.program,
				payloadTypes.enum.report,
				payloadTypes.enum.rule,
				payloadTypes.enum.simple_measure,
				payloadTypes.enum.task
			];
			const typeFilterFromURL = page.url.searchParams.getAll('type');
			const typeFilter = allTypeOptions.filter(
				(t) => typeFilterFromURL.length === 0 || typeFilterFromURL.includes(t)
			);
			const query = new URLSearchParams(page.url.searchParams);
			query.delete('type');
			for (const t of typeFilter) query.append('type', t);

			const result = await fetchContainerPage<Container<AnyPayload>>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query,
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
		initialItems: () => data.containers,
		pageSize: DEFAULT_PAGE_SIZE,
		resetKey: () => resetKey
	});
	let containers = $derived(
		withOptimistic(
			list.items,
			$lastCreatedContainer,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);
</script>

<AllPage {data} filterBarInitiallyOpen>
	<Catalog
		{containers}
		payloadType={[
			payloadTypes.enum.event,
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			payloadTypes.enum.page,
			payloadTypes.enum.program,
			payloadTypes.enum.post,
			payloadTypes.enum.report,
			payloadTypes.enum.rule,
			payloadTypes.enum.simple_measure
		]}
	>
		{#snippet footer()}
			<LazyLoadSentinel
				hasMore={list.hasMore}
				loading={list.loadingMore}
				onLoadMore={list.loadMore}
			/>
		{/snippet}
	</Catalog>
	<ContextTabs slug="all-catalog" />
</AllPage>
