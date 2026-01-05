<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { type Container } from '$lib/models';

	interface Props {
		children: Snippet;
		data: {
			containers: Container[];
			useNewIndicators: boolean;
			facets?: Map<string, Map<string, number>>;
		};
	}

	let { children, data }: Props = $props();

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
