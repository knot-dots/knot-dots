<script lang="ts">
	import { type Snippet } from 'svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import { type PageData } from '../../routes/[guid=uuid]/help/catalog/$types';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';

	interface Props {
		children: Snippet;
		data: PageData;
	}

	let { children, data }: Props = $props();
</script>

<BulkActionContextProvider actions={['visibility', 'delete']}>
	<FullscreenLayout>
		{#snippet header()}
			<Header facets={data.facets} search />
		{/snippet}

		{#snippet main()}
			{@render children()}
		{/snippet}
	</FullscreenLayout>
</BulkActionContextProvider>
