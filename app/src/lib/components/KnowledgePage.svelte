<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		fromCounts,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[]; facets?: Record<string, Record<string, number>> };
	}

	let { children, data }: Props = $props();

	// Prefer ES-provided facets if available; fallback to local computation.
	let facets = $derived.by(() => {
		const facets = new Map<string, Map<string, number>>([
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
		{@render children()}
	{/snippet}
</Layout>
