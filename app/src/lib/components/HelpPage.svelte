<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { type PageData } from '../../routes/[guid=uuid]/help/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
	}

	let { children, data }: Props = $props();
</script>

<Layout bulkActions={['visibility', 'delete']}>
	{#snippet header()}
		<Header facets={data.facets} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
