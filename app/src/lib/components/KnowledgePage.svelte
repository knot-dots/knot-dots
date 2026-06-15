<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';

	import type { PageData } from '../../routes/[guid=uuid]/knowledge/catalog/$types';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		children: Snippet;
		data: PageData;
		filterBarInitiallyOpen?: boolean;
	}

	let { children, data, filterBarInitiallyOpen = false }: Props = $props();

	let facets = $derived(data.facets);

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		selected: new SvelteSet<string>()
	});
</script>

<Layout>
	{#snippet header()}
		<Header {filterBarInitiallyOpen} {facets} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
