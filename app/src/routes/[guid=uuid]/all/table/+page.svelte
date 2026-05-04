<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import AllPage from '$lib/components/AllPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import Table from '$lib/components/Table.svelte';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import withOptimistic from '$lib/client/withOptimistic';
	import { createFeatureDecisions } from '$lib/features';
	import { type AnyContainer, payloadTypes } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initialItemsKey = $derived(data.containers.map(({ guid }) => guid).join(','));
	const resetKey = $derived(
		`${page.url.pathname}?${page.url.searchParams.toString()}|${initialItemsKey}`
	);
	const list = createPaginatedList<AnyContainer>({
		fetchPage: async ({ offset, signal }) => {
			const features = createFeatureDecisions(page.data.features);
			const allTypeOptions = [
				payloadTypes.enum.goal,
				payloadTypes.enum.help,
				payloadTypes.enum.knowledge,
				payloadTypes.enum.measure,
				payloadTypes.enum.organizational_unit,
				...(features.usePage() ? [payloadTypes.enum.page] : []),
				payloadTypes.enum.program,
				...(features.useReport() ? [payloadTypes.enum.report] : []),
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

			const result = await fetchContainerPage<AnyContainer>({
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
		withOptimistic(list.items, $lastCreatedContainer, $lastUpdatedContainers)
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
		{ heading: $_('object'), key: 'type' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('status'), key: 'status' },
		...customCategoryColumns,
		{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
		{ heading: $_('planned_duration'), key: 'duration' },
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('goal.hierarchy_level'), key: 'hierarchyLevel' },
		{ heading: $_('type'), key: 'objectType' }
	]);
</script>

<AllPage {data}>
	<Table {columns} rows={containers}>
		{#snippet footer()}
			<LazyLoadSentinel
				hasMore={list.hasMore}
				loading={list.loadingMore}
				onLoadMore={list.loadMore}
			/>
		{/snippet}
	</Table>
	<Help slug="all-table" />
</AllPage>
