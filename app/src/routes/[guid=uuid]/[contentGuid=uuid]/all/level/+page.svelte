<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import Chapters from '$lib/components/Chapters.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import { computeFacetCount, predicates } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['contributes-to']
		]
	});

	let container = $derived(data.container);

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

	let facets = $derived(
		computeFacetCount(buildCategoryFacetsWithCounts(page.data.categoryContext.options), containers)
	);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<Chapters program={container} {containers} />

		<ContextTabs slug="all-level" />
	{/snippet}
</Layout>
