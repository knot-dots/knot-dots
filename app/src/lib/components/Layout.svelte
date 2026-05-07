<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import CreateContainerDialog from '$lib/components/CreateContainerDialog.svelte';
	import CreateObjectiveOrEffectDialog from '$lib/components/CreateObjectiveOrEffectDialog.svelte';
	import Header from '$lib/components/Header.svelte';
	import SidebarWithFavorites from '$lib/components/SidebarWithFavorites.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { overlay } from '$lib/stores';

	interface Props {
		header?: Snippet;
		main: Snippet;
		sidebar?: Snippet;
	}

	let { header, main, sidebar }: Props = $props();

	const duration = 300;
	const delay = duration + 100;
	const y = 10;

	const transitionIn = { easing: cubicOut, y, duration, delay };
	const transitionOut = { easing: cubicIn, y: -y, duration };

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	setContext('createContainerDialog', { getElement: () => dialog });

	// svelte-ignore non_reactive_update
	let createEffectDialog: HTMLDialogElement;

	let mobileMenuOpen = $state(false);

	setContext('mobileMenu', {
		get open() {
			return mobileMenuOpen;
		},
		toggle() {
			mobileMenuOpen = !mobileMenuOpen;
		},
		close() {
			mobileMenuOpen = false;
		}
	});
</script>

<div class="app-wrapper">
	<nav class:mobile-open={mobileMenuOpen}>
		{#if sidebar}
			{@render sidebar()}
		{:else}
			<SidebarWithFavorites />
		{/if}
	</nav>

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

	{#if $overlay}
		<Overlay data={$overlay} />
	{/if}
</div>

<CreateContainerDialog bind:dialog />

<CreateObjectiveOrEffectDialog bind:dialog={createEffectDialog} />

<style>
	.app-wrapper {
		display: flex;
		flex-direction: row;
		height: 100vh;
		width: 100%;
	}

	.main-with-header-wrapper {
		background-color: white;
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		padding: 0;
	}

	nav {
		border-right: 1px solid var(--color-gray-200);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		font-size: 0.875rem;
		min-width: 0;
	}

	main {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		overflow-y: auto;
	}

	main > :global(:is(:not(aside))) {
		min-width: calc(100vw - var(--sidebar-max-width) - 1px);
	}

	@media (max-width: 480px) {
		nav {
			background-color: white;
			display: none;
			height: 100vh;
			left: 0;
			position: fixed;
			top: 0;
			width: var(--sidebar-max-width);
			z-index: 100;
		}

		nav.mobile-open {
			display: flex;
		}
	}
</style>
