<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import withOptimistic from '$lib/client/withOptimistic';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import {
		computeFacetCount,
		indicatorCategories,
		indicatorTypes,
		isIndicatorTemplateContainer,
		payloadTypes
	} from '$lib/models';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

	let categoryContext = $derived(
		filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.indicator_template])
	);

	let facets = $derived(
		computeFacetCount(
			new Map([
				...buildCategoryFacetsWithCounts(categoryContext.options),
				['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
				['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))]
			]),
			containers.filter(isIndicatorTemplateContainer)
		)
	);
</script>

<PageLayout>
	<FullscreenLayout>
		{#snippet header()}
			<Header {facets} />
		{/snippet}

		{#snippet main()}
			<NewIndicators {containers} />
		{/snippet}
	</FullscreenLayout>
</PageLayout>
