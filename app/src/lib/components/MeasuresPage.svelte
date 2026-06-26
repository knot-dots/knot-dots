<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
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
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});

	setBulkActionContext({
		actions: ['status', 'visibility', 'delete'],
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
