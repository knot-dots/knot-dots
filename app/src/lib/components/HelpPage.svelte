<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { type PageData } from '../../routes/[guid=uuid]/help/catalog/$types';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';

	interface Props {
		children: Snippet;
		data: PageData;
	}

	let { children, data }: Props = $props();
</script>

<BulkActionContextProvider actions={['visibility', 'delete']}>
	<Layout>
		{#snippet header()}
			<Header facets={data.facets} search />
		{/snippet}

		{#snippet main()}
			{@render children()}
		{/snippet}
	</Layout>
</BulkActionContextProvider>
