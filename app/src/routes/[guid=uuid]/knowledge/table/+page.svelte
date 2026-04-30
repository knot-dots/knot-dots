<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Help from '$lib/components/Help.svelte';
	import KnowledgePage from '$lib/components/KnowledgePage.svelte';
	import Table from '$lib/components/Table.svelte';
	import { getCategoryKeys } from '$lib/categoryOptions';
	import { createFeatureDecisions } from '$lib/features';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import { type KnowledgeContainer, payloadTypes } from '$lib/models';
	import createPaginatedList from '$lib/client/createPaginatedList.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';

	let { data }: PageProps = $props();

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

	const featureDecisions = $derived(createFeatureDecisions(page.data.features ?? []));

	const legacyCategoryColumns = [
		{ heading: $_('category'), key: 'sdg' },
		{ heading: $_('topic'), key: 'topic' },
		{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
		{ heading: $_('audience'), key: 'audience' }
	];

	const customCategoryColumns = $derived(
		featureDecisions.useCustomCategories() && data.categoryOptions
			? getCategoryKeys(data.categoryOptions).map((key) => ({
					heading: data.categoryOptions?.__categoryLabels__?.[key] ?? key,
					key
				}))
			: null
	);

	const columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		...(customCategoryColumns ?? legacyCategoryColumns),
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
	]);
</script>

<KnowledgePage data={{ ...data, containers }}>
	<Table
		categoryOptions={featureDecisions.useCustomCategories() ? data.categoryOptions : undefined}
		{columns}
		rows={containers}
	>
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
