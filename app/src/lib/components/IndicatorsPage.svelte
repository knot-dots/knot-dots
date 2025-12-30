<script lang="ts">
	import { type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		fromCounts,
		type Container,
		indicatorCategories,
		indicatorTypes,
		isIndicatorContainer,
		isIndicatorTemplateContainer,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[]; useNewIndicators: boolean };
	}

	let { children, data }: Props = $props();

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

<<<<<<< HEAD:app/src/routes/[[guid=uuid]]/indicators/+page.svelte
		if (!data.facets || Object.keys(data.facets).length === 0) {
			return computeFacetCount(facets, data.containers);
		}

		return facets;
=======
		return computeFacetCount(
			facets,
			data.containers.filter((c) =>
				data.useNewIndicators ? isIndicatorTemplateContainer(c) : isIndicatorContainer(c)
			)
		);
>>>>>>> main:app/src/lib/components/IndicatorsPage.svelte
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
