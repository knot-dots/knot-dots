<script>
	import { fly } from 'svelte/transition';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { browser } from '$app/environment';
	import Navigation from '$lib/components/Navigation.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import { overlay } from '$lib/stores';

	const duration = 300;
	const delay = duration + 100;
	const y = 10;

	const transitionIn = { easing: cubicOut, y, duration, delay };
	const transitionOut = { easing: cubicIn, y: -y, duration };
</script>

<Navigation />
<div in:fly={transitionIn} out:fly={transitionOut}>
	<slot name="sidebar" />
	<main>
		<slot name="main" />
		{#if $overlay.revisions[$overlay.revisions.length - 1]}
			<Overlay {...$overlay} />
		{/if}
		{#if browser && $overlay.object}
			<RelationOverlay object={$overlay.object} />
		{/if}
	</main>
</div>

<style>
	div {
		display: flex;
		height: 100vh;
		padding-top: var(--nav-height);
		width: 100%;
	}

	main {
		background-color: white;
		display: flex;
		flex-grow: 1;
		min-width: 0;
		padding: 0;
	}
</style>
