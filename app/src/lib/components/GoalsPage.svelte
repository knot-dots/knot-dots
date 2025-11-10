<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		policyFieldBNK,
		predicates,
		programTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[]; facets?: Record<string, Record<string, number>> };
	}

	let { children, data }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with']
		]
	});

	// Prefer server-provided Elasticsearch facet counts if available; otherwise fall back to local computation
	let facets = $derived.by(() => {
		// Helper to turn an object of counts into a Map and ensure all known options are present with 0
		function fromCounts(options: string[], counts?: Record<string, number>) {
			const m = new Map<string, number>();
			// include all known options with at least 0
			for (const opt of options) m.set(opt, Math.max(0, counts?.[opt] ?? 0));
			// include any extra keys that may exist in ES results but aren't in options
			if (counts) {
				for (const [k, v] of Object.entries(counts)) if (!m.has(k)) m.set(k, v);
			}
			return m;
		}

		if (data.facets && Object.keys(data.facets).length > 0) {
			const m = new Map<string, Map<string, number>>([
				...((page.url.searchParams.has('related-to')
					? [
							[
								'relationType',
								new Map([
									[predicates.enum['is-part-of'], 0],
									[predicates.enum['is-consistent-with'], 0],
									[predicates.enum['is-equivalent-to'], 0],
									[predicates.enum['is-inconsistent-with'], 0]
								])
							]
						]
					: []) as Array<[string, Map<string, number>]>),
				...((!page.data.currentOrganization.payload.default
					? [['included', new Map()]]
					: []) as Array<[string, Map<string, number>]>),
				['audience', fromCounts(audience.options as string[], data.facets.audience)],
				['category', fromCounts(sustainableDevelopmentGoals.options as string[], data.facets.category)],
				['topic', fromCounts(topics.options as string[], data.facets.topic)],
				['policyFieldBNK', fromCounts(policyFieldBNK.options as string[], data.facets.policyFieldBNK)],
				['programType', fromCounts(programTypes.options as string[], data.facets.programType)]
			]);
			console.log('Using ES-provided facets:', m);
			return m;
		}

		// Fallback: compute locally from containers
		const m = new Map([
			...((page.url.searchParams.has('related-to')
				? [
						[
							'relationType',
							new Map([
								[predicates.enum['is-part-of'], 0],
								[predicates.enum['is-consistent-with'], 0],
								[predicates.enum['is-equivalent-to'], 0],
								[predicates.enum['is-inconsistent-with'], 0]
							])
						]
					]
				: []) as Array<[string, Map<string, number>]>),
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['programType', new Map(programTypes.options.map((v) => [v as string, 0]))]
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
