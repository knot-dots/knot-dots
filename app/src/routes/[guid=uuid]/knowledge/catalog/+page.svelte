<script lang="ts">
	import { page } from '$app/state';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import withOptimistic from '$lib/client/withOptimistic';
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import KnowledgePage from '$lib/components/KnowledgePage.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import { type KnowledgeContainer, payloadTypes } from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const featureDecisions = $derived(createFeatureDecisions(data.features));

	function customCategoryFilters() {
		const result: Record<string, string[]> = {};
		for (const key of Object.keys(data.categoryOptions ?? {})) {
			if (key === '__categoryLabels__') continue;
			const values = page.url.searchParams.getAll(key);
			if (values.length > 0) {
				result[key] = values;
			}
		}
		return result;
	}

	function filters() {
		const relatedTo = page.url.searchParams.get('related-to');
		const categoryFilters = customCategoryFilters();

		if (relatedTo) {
			return {
				...categoryFilters,
				payloadType: [payloadTypes.enum.knowledge],
				'related-to': relatedTo
			};
		}

		return {
			...categoryFilters,
			...(featureDecisions.useCustomCategories()
				? {}
				: {
						audience: page.url.searchParams.getAll('audience'),
						policyFieldBNK: page.url.searchParams.getAll('policyFieldBNK'),
						sdg: page.url.searchParams.getAll('sdg'),
						topic: page.url.searchParams.getAll('topic')
					}),
			payloadType: [payloadTypes.enum.knowledge],
			programType: page.url.searchParams.getAll('programType'),
			terms: page.url.searchParams.get('terms') ?? undefined
		};
	}

	const initialItemsKey = $derived(data.containers.map(({ guid }) => guid).join(','));
	const resetKey = $derived(
		`${page.url.pathname}?${page.url.searchParams.toString()}|${initialItemsKey}`
	);
	const list = createPaginatedList<KnowledgeContainer>({
		fetchPage: async ({ offset, signal }) => {
			const result = await fetchContainerPage<KnowledgeContainer>({
				contextGuid: page.params.guid,
				filters: filters(),
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
