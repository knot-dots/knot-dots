<script>
	import { fly } from 'svelte/transition';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import Navigation from '$lib/components/Navigation.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { overlay } from '$lib/stores';

	const duration = 300;
	const delay = duration + 100;
	const y = 10;

	const transitionIn = { easing: cubicOut, y, duration, delay };
	const transitionOut = { easing: cubicIn, y: -y, duration };
</script>

<Navigation />
<div in:fly={transitionIn} out:fly={transitionOut}>
	<main>
		<aside>
			<slot name="sidebar" />
		</aside>
		<slot name="main" />
		{#if $overlay}
			<Overlay data={$overlay} />
		{/if}
	</main>
</div>

<style>
	div {
		height: 100vh;
		padding-top: var(--nav-height);
		width: 100%;
	}

	main {
		background-color: white;
		display: flex;
		flex-grow: 1;
		height: 100%;
		min-width: 0;
		padding: 0;
	}

	main > aside {
		font-size: 0.875rem;
		height: calc(100vh - var(--nav-height));
		min-width: 0;
		padding: 1.5rem 0.5rem 0.5rem;
		position: absolute;
		top: var(--nav-height);
		width: 3.5rem;
	}

	main > aside + :global(*) {
		margin-left: 3.5rem;
	}
</style>
