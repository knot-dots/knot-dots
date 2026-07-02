<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { predicates } from '$lib/models';

	interface Props {
		children: Snippet;
		facets: Map<string, Map<string, number>>;
		filterBarInitiallyOpen?: boolean;
	}

	let { children, facets, filterBarInitiallyOpen = false }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-inconsistent-with']]
	});
</script>

<Layout bulkActions={['status', 'visibility', 'delete']}>
	{#snippet header()}
		<Header {filterBarInitiallyOpen} {facets} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
