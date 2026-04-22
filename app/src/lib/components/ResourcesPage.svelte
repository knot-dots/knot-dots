<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import type { PageData } from '../../routes/[guid=uuid]/resources/catalog/$types';
	import { computeFacetCount, type AnyContainer, predicates } from '$lib/models';

	interface Props {
		children: Snippet;
		containers?: AnyContainer[];
		data: PageData;
		sortOptions?: [string, string][];
		filterBarInitiallyOpen?: boolean;
	}

	let {
		children,
		data,
		containers = data.containers,
		sortOptions,
		filterBarInitiallyOpen = false
	}: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for']]
	});

	let facets = $derived(
		computeFacetCount(data.facets, containers, {
			useCategoryPayload: !!data.categoryOptions,
			reset: true
		})
	);
</script>

<Layout>
	{#snippet header()}
		<Header
			{filterBarInitiallyOpen}
			{facets}
			facetLabels={data.facetLabels ?? undefined}
			categoryOptions={data.categoryOptions ?? null}
			search
			{sortOptions}
		/>
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
