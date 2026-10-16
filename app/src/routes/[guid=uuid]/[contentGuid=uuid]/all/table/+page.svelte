<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import withOptimistic from '$lib/client/withOptimistic';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import ProgramTable from '$lib/components/ProgramTable.svelte';
	import { computeFacetCount, status } from '$lib/models';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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
		computeFacetCount(
			new Map([
				['status', new Map(status.options.map((s) => [s, 0]))],
				...buildCategoryFacetsWithCounts(page.data.categoryContext.options)
			]),
			containers
		)
	);
</script>

<PageLayout>
	<FullscreenLayout>
		{#snippet header()}
			<Header {facets} search />
		{/snippet}

		{#snippet main()}
			<ProgramTable program={container} {containers} />

			<ContextTabs slug="all-table" />
		{/snippet}
	</FullscreenLayout>
</PageLayout>
