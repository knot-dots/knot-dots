<script lang="ts">
	import { type Snippet } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';

	interface Props {
		header?: Snippet;
		main: Snippet;
	}

	let { header, main }: Props = $props();

	const duration = 300;
	const delay = duration + 100;
	const y = 10;

	const transitionIn = { easing: cubicOut, y, duration, delay };
	const transitionOut = { easing: cubicIn, y: -y, duration };
</script>

<div class="main-with-header-wrapper">
	{#if header}
		{@render header()}
	{:else}
		<Header filterBarInitiallyOpen={page.data.filterBarInitiallyOpen} />
	{/if}

	<main in:fly={transitionIn} out:fly={transitionOut}>
		{@render main()}
	</main>
</div>

<style>
	.main-with-header-wrapper {
		background-color: white;
		container: main / inline-size;
		display: flex;
		flex-direction: column;
		flex: 1 1;
		min-width: 0;
		padding: 0;
	}

	.main-with-header-wrapper:has(+ :global(.overlay)) main {
		--overlay-compensation-margin: calc(100vw * var(--overlay-width-factor));
	}

	main {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		min-width: 100vw;
		overflow: hidden;
		position: relative;
	}

	@container (min-width: 48rem) {
		main {
			flex-direction: row;
		}
	}

	@media (min-width: 60rem) {
		:global(nav:not(.collapsed) + .main-with-header-wrapper main) {
			min-width: calc(100vw - var(--sidebar-max-width));
		}
	}
</style>
