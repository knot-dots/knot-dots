<script lang="ts">
	import Indicators from '$lib/components/Indicators.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import type { PageProps } from './$types';
	import {
		audience,
		computeFacetCount,
		indicatorCategories,
		indicatorTypes,
		isIndicatorContainer,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import Header from '$lib/components/Header.svelte';

	let { data }: PageProps = $props();

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
			data.containers.filter(isIndicatorContainer)
		)
	);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} />
	{/snippet}

	{#snippet main()}
		<Indicators containers={data.containers} />
	{/snippet}
</Layout>
