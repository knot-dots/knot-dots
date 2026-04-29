<script lang="ts">
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import type { PageProps } from './$types';
	import {
		audience,
		computeFacetCount,
		indicatorCategories,
		indicatorTypes,
		isIndicatorTemplateContainer,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import Header from '$lib/components/Header.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	let facets = $derived(
		computeFacetCount(
			new Map([
				['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
				['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
				['audience', new Map(audience.options.map((v) => [v as string, 0]))],
				['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
				['topic', new Map(topics.options.map((v) => [v as string, 0]))],
				['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
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
