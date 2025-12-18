<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		fromCounts,
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
		const facets = new Map<string, Map<string, number>>([
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
			['audience', fromCounts(audience.options as string[], data.facets?.audience)],
			[
				'category',
				fromCounts(sustainableDevelopmentGoals.options as string[], data.facets?.category)
			],
			['topic', fromCounts(topics.options as string[], data.facets?.topic)],
			[
				'policyFieldBNK',
				fromCounts(policyFieldBNK.options as string[], data.facets?.policyFieldBNK)
			],
			['programType', fromCounts(programTypes.options as string[], data.facets?.programType)]
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
