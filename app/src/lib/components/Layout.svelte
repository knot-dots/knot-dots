<script lang="ts">
	import { setContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import CreateContainerDialog from '$lib/components/CreateContainerDialog.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import NewSidebar from '$lib/components/NewSidebar.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { overlay } from '$lib/stores';

	const duration = 300;
	const delay = duration + 100;
	const y = 10;

	const transitionIn = { easing: cubicOut, y, duration, delay };
	const transitionOut = { easing: cubicIn, y: -y, duration };

	let dialog: HTMLDialogElement;

	setContext('createContainerDialog', { getElement: () => dialog });
</script>

<div in:fly={transitionIn} out:fly={transitionOut}>
	<aside>
		{#if $$slots.sidebar}
			<slot name="sidebar" />
		{:else}
			<NewSidebar />
		{/if}
	</aside>
	<main>
		<Navigation />
		<slot name="main" />
	</main>
	{#if $overlay}
		<Overlay data={$overlay} />
	{/if}
</div>
<CreateContainerDialog bind:dialog />

<style>
	div {
		display: flex;
		flex-direction: row;
		height: 100vh;
		width: 100%;
	}

	aside {
		border-right: 1px solid var(--color-gray-200);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		font-size: 0.875rem;
		max-width: 17rem;
		min-width: 0;
	}

	main {
		background-color: white;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		height: 100%;
		min-width: 0;
		padding: 0;
	}
</style>
