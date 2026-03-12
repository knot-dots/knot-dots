<script lang="ts">
	import { type Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';

	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();
</script>

<Layout>
	{#snippet header()}
		<Header search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
