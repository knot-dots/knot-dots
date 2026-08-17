<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import { predicates } from '$lib/models';

	interface Props {
		children: Snippet;
		facets: Map<string, Map<string, number>>;
		filterBarInitiallyOpen?: boolean;
	}

	let { children, facets, filterBarInitiallyOpen = false }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with']
		]
	});
</script>

<PageLayout>
	<BulkActionContextProvider actions={['status', 'visibility', 'delete']}>
		<FullscreenLayout>
			{#snippet header()}
				<Header {filterBarInitiallyOpen} {facets} search />
			{/snippet}

			{#snippet main()}
				{@render children()}
			{/snippet}
		</FullscreenLayout>
	</BulkActionContextProvider>
</PageLayout>
