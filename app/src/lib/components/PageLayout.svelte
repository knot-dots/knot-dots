<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { overlay, overlayWidth } from '$lib/stores';
	import CreateContainerDialog from '$lib/components/CreateContainerDialog.svelte';
	import CreateObjectiveOrEffectDialog from '$lib/components/CreateObjectiveOrEffectDialog.svelte';

	interface Props {
		children: Snippet;
		sidebar?: Snippet;
	}

	let { children, sidebar }: Props = $props();

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

	{@render children()}

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

	@media (min-width: 60rem) {
		nav {
			position: static;
		}

		nav:not(.collapsed) {
			display: flex;
		}
	}
</style>
