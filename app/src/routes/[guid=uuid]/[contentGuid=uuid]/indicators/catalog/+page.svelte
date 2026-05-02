<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import withOptimistic from '$lib/client/withOptimistic';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import {
		computeFacetCount,
		indicatorCategories,
		indicatorTypes,
		isIndicatorTemplateContainer,
		payloadTypes
	} from '$lib/models';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
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

<Layout>
	{#snippet header()}
		<Header {facets} />
	{/snippet}

	{#snippet main()}
		<NewIndicators {containers} />
	{/snippet}
</Layout>
