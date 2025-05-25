<script lang="ts">
	import { setContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import CreateContainerDialog from '$lib/components/CreateContainerDialog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
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

<div class="app-wrapper">
	<nav>
		{#if $$slots.sidebar}
			<slot name="sidebar" />
		{:else}
			<Sidebar />
		{/if}
	</nav>

	<div class="main-with-overlay-wrapper">
		{#if $$slots.header}
			<slot name="header" />
		{:else}
			<Header />
		{/if}

		<main in:fly={transitionIn} out:fly={transitionOut}>
			<slot name="main" />
			{#if $overlay}
				<Overlay data={$overlay} />
			{/if}
		</main>
	</div>
</div>

<CreateContainerDialog bind:dialog />

<style>
	.app-wrapper {
		display: flex;
		flex-direction: row;
		height: 100vh;
		width: 100%;
	}

	.main-with-overlay-wrapper {
		background-color: white;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		min-width: 0;
		padding: 0;
	}

	nav {
		border-right: 1px solid var(--color-gray-200);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		font-size: 0.875rem;
		max-width: var(--sidebar-max-width);
		min-width: 0;
	}

	main {
		display: flex;
		flex-direction: row;
		flex-grow: 1;
		max-height: calc(100vh - var(--header-height));
	}
</style>
