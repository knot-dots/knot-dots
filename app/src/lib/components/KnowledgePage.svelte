<script lang="ts">
	import { type Snippet } from 'svelte';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import type { PageData } from '../../routes/[guid=uuid]/knowledge/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		filterBarInitiallyOpen?: boolean;
	}

	let { children, data, filterBarInitiallyOpen = false }: Props = $props();

	let facets = $derived(data.facets);
</script>

<BulkActionContextProvider actions={['visibility', 'delete']}>
	<FullscreenLayout>
		{#snippet header()}
			<Header {filterBarInitiallyOpen} {facets} search />
		{/snippet}

		{#snippet main()}
			{@render children()}
		{/snippet}
	</FullscreenLayout>
</BulkActionContextProvider>
