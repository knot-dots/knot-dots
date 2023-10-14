<script lang="ts">
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { overrideItemIdKeyNameBeforeInitialisingDndZones } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	overrideItemIdKeyNameBeforeInitialisingDndZones('guid');

	const duration = 300;
	const delay = duration + 100;
	const y = 10;

	const transitionIn = { easing: cubicOut, y, duration, delay };
	const transitionOut = { easing: cubicIn, y: -y, duration };
</script>

<svelte:head>
	<title>{$_('page_title')}</title>
</svelte:head>

<Navigation />
{#key data.pathname}
	<div in:fly={transitionIn} out:fly={transitionOut}>
		<Sidebar />
		<main>
			<slot />
		</main>
	</div>
{/key}

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
