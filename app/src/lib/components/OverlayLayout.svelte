<script lang="ts">
	import type { Snippet } from 'svelte';
	import Header from '$lib/components/Header.svelte';

	interface Props {
		header?: Snippet;
		main: Snippet;
	}

	let { header, main }: Props = $props();
</script>

{#if header}
	{@render header()}
{:else}
	<Header />
{/if}

{@render main()}
