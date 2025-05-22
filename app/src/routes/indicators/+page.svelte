<script lang="ts">
	import { setContext } from 'svelte';
	import Indicators from '$lib/components/Indicators.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import {
		audience,
		computeFacetCount,
		indicatorCategories,
		indicatorTypes,
		policyFieldBNK,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-affected-by']]
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	<Navigation {facets} search slot="header" />

	<svelte:fragment slot="main">
		<Indicators containers={data.containers} />
	</svelte:fragment>
</Layout>
