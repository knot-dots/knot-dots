<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
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
		function fromCounts(options: string[], counts?: Record<string, number>) {
			const m = new Map<string, number>();
			for (const opt of options) m.set(opt, Math.max(0, counts?.[opt] ?? 0));
			if (counts) {
				for (const [k, v] of Object.entries(counts)) if (!m.has(k)) m.set(k, v);
			}
			return m;
		}
		if (data.facets && Object.keys(data.facets).length > 0) {
			return new Map<string, Map<string, number>>([
				['audience', fromCounts(audience.options as string[], data.facets.audience)],
				['category', fromCounts(sustainableDevelopmentGoals.options as string[], data.facets.category)],
				['topic', fromCounts(topics.options as string[], data.facets.topic)],
				['policyFieldBNK', fromCounts(policyFieldBNK.options as string[], data.facets.policyFieldBNK)]
			]);
		}
		const m = new Map([
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
		]);
		return computeFacetCount(m, data.containers);
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
