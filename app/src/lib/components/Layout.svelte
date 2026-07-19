<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';
	import CreateContainerDialog from '$lib/components/CreateContainerDialog.svelte';
	import CreateObjectiveOrEffectDialog from '$lib/components/CreateObjectiveOrEffectDialog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { overlay, overlayWidth } from '$lib/stores';

	interface Props {
		bulkActions?: string[];
		header?: Snippet;
		main: Snippet;
		sidebar?: Snippet;
	}

	let { bulkActions = [], header, main, sidebar }: Props = $props();

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

	let sidebarExpanded: boolean | undefined = $state(undefined);

	setContext('sidebar', {
		get expanded() {
			return sidebarExpanded;
		},
		collapse() {
			sidebarExpanded = false;
		},
		expand() {
			sidebarExpanded = true;
		}
	});
</script>

<div class="app-wrapper" style="--overlay-width-factor: {$overlayWidth}">
	<nav class={{ collapsed: sidebarExpanded === false, expanded: sidebarExpanded === true }}>
		{#if sidebar}
			{@render sidebar()}
		{:else}
			<Sidebar />
		{/if}
	</nav>

	<div class="main-with-header-wrapper">
		{#if bulkActions.length > 0}
			<BulkActionContextProvider actions={bulkActions}>
				{#if header}
					{@render header()}
				{:else}
					<Header filterBarInitiallyOpen={page.data.filterBarInitiallyOpen} />
				{/if}

				<main in:fly={transitionIn} out:fly={transitionOut}>
					{@render main()}
				</main>
			</BulkActionContextProvider>
		{:else}
			{#if header}
				{@render header()}
			{:else}
				<Header filterBarInitiallyOpen={page.data.filterBarInitiallyOpen} />
			{/if}

			<main in:fly={transitionIn} out:fly={transitionOut}>
				{@render main()}
			</main>
		{/if}
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
		flex: 1 1;
		min-width: 0;
		padding: 0;
	}

	.main-with-header-wrapper:has(+ :global(.overlay)) main {
		--overlay-compensation-margin: calc(100vw * var(--overlay-width-factor));
	}

	nav {
		background-color: var(--color-white);
		display: none;
		flex-direction: column;
		flex-shrink: 0;
		font-size: 0.875rem;
		gap: 0.25rem;
		height: 100vh;
		left: 0;
		max-width: var(--sidebar-max-width);
		min-width: 0;
		padding: 0.25rem;
		position: fixed;
		top: 0;
		width: var(--sidebar-max-width);
		z-index: 4;
	}

	nav.expanded {
		display: flex;
	}

	main {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		min-width: 100vw;
		overflow-x: hidden;
		overflow-y: auto;
	}

	@media (min-width: 60rem) {
		nav {
			position: static;
		}

		nav:not(.collapsed) {
			display: flex;
		}

		nav:not(.collapsed) + .main-with-header-wrapper main {
			min-width: calc(100vw - var(--sidebar-max-width));
		}
	}
</style>
