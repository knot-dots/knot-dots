<script lang="ts">
	import { type Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { type PageData } from '../../routes/[guid=uuid]/help/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
	}

	let { children, data }: Props = $props();

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		selected: new SvelteSet<string>()
	});
</script>

<Layout>
	{#snippet header()}
		<Header facets={data.facets} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
