<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';

	import type { PageData } from '../../routes/[guid=uuid]/knowledge/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		filterBarInitiallyOpen?: boolean;
	}
	let { children, data, filterBarInitiallyOpen = false }: Props = $props();

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header
			{filterBarInitiallyOpen}
			{facets}
			facetLabels={data.facetLabels ?? undefined}
			categoryOptions={data.categoryOptions ?? null}
			search
		/>
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
