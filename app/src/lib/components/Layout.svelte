<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import CreateContainerDialog from '$lib/components/CreateContainerDialog.svelte';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { setToastContext, type ToastProps } from '$lib/contexts/toast';
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

	let toasts = $state([] as ToastProps[]);

	function addToast(toast: ToastProps) {
		toasts = [...toasts, toast];
	}

	function removeToast(index: number) {
		toasts = toasts.filter((_, i) => i !== index);
	}

	setToastContext(addToast);
</script>

<div class="app-wrapper">
	<nav>
		{#if sidebar}
			{@render sidebar()}
		{:else}
			<Sidebar />
		{/if}
	</nav>

	<div class="main-with-header-wrapper">
		<div class="toasts">
			{#each toasts as toast, index (index)}
				<Toast {...toast} onclose={() => removeToast(index)} />
			{/each}
		</div>

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

	.toasts {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		position: fixed;
		right: 3rem;
		top: 6rem;
		width: min(20rem, 80%);
		z-index: 1000;
	}
</style>
