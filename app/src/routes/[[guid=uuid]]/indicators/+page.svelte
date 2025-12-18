<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Indicators from '$lib/components/Indicators.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import {
		audience,
		computeFacetCount,
		fromCounts,
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
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['indicatorType', fromCounts(indicatorTypes.options as string[], data.facets?.indicatorType)],
			[
				'indicatorCategory',
				fromCounts(indicatorCategories.options as string[], data.facets?.indicatorCategory)
			],
			['audience', fromCounts(audience.options as string[], data.facets?.audience)],
			[
				'category',
				fromCounts(sustainableDevelopmentGoals.options as string[], data.facets?.category)
			],
			['topic', fromCounts(topics.options as string[], data.facets?.topic)],
			[
				'policyFieldBNK',
				fromCounts(policyFieldBNK.options as string[], data.facets?.policyFieldBNK)
			]
		]);

		if (!data.facets || Object.keys(data.facets).length === 0) {
			return computeFacetCount(facets, data.containers);
		}

		return facets;
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		{#if data.useNewIndicators}
			<NewIndicators containers={data.containers} />
		{:else}
			<Indicators containers={data.containers} />
		{/if}
		<Help slug="indicators" />
	{/snippet}
</Layout>
