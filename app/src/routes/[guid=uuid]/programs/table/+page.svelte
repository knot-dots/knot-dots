<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { type Container, payloadTypes, type ProgramPayload } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initialItemsKey = $derived(data.containers.map(({ guid }) => guid).join(','));
	const resetKey = $derived(
		`${page.url.pathname}?${page.url.searchParams.toString()}|${initialItemsKey}`
	);
	const list = createPaginatedList<Container<ProgramPayload>>({
		fetchPage: async ({ offset, signal }) => {
			const result = await fetchContainerPage<Container<ProgramPayload>>({
				contextGuid: page.params.guid,
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: new URLSearchParams([
					...page.url.searchParams,
					['payloadType', payloadTypes.enum.program]
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
		initialItems: () => data.containers as Container<ProgramPayload>[],
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
		{ heading: $_('program_status'), key: 'status' },
		...customCategoryColumns,
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('program_type'), key: 'objectType' }
	]);
</script>

<ProgramsPage facets={data.facets}>
	<Table {columns} rows={containers}>
		{#snippet footer()}
			<LazyLoadSentinel
				hasMore={list.hasMore}
				loading={list.loadingMore}
				onLoadMore={list.loadMore}
			/>
		{/snippet}
	</Table>
	<ContextTabs slug="programs-table" />
</ProgramsPage>
