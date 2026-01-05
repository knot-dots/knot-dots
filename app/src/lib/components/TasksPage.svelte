<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { type Container, predicates } from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[]; facets?: Map<string, Map<string, number>> };
		sortOptions?: [string, string][];
	}

	let { children, data, sortOptions }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for']]
	});

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search {sortOptions} />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
