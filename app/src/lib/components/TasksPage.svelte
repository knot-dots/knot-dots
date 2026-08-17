<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import { predicates } from '$lib/models';
	import type { PageData } from '../../routes/[guid=uuid]/tasks/catalog/$types';
	import PageLayout from '$lib/components/PageLayout.svelte';

	interface Props {
		children: Snippet;
		data: PageData;
		sortOptions?: [string, string][];
		filterBarInitiallyOpen?: boolean;
	}

	let { children, data, filterBarInitiallyOpen = false, sortOptions }: Props = $props();

	let facets = $derived(data.facets);

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for']]
	});
</script>

<PageLayout>
	<BulkActionContextProvider actions={['status', 'visibility', 'delete']}>
		<FullscreenLayout>
			{#snippet header()}
				<Header {filterBarInitiallyOpen} {facets} search {sortOptions} />
			{/snippet}

			{#snippet main()}
				{@render children()}
			{/snippet}
		</FullscreenLayout>
	</BulkActionContextProvider>
</PageLayout>
