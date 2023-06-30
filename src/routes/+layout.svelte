<script lang="ts">
	import type Keycloak from 'keycloak-js';
	import { onMount, setContext } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { _ } from 'svelte-i18n';
	import '../app.css';
	import { page } from '$app/stores';
	import { initKeycloak, key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import Navigation from '$lib/components/Navigation.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { BOARD_ROUTES } from '$lib/globals';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	let kc: Keycloak;

	setContext<KeycloakContext>(key, {
		getKeycloak: () => kc
	});

	onMount(() => {
		kc = initKeycloak({
			checkLoginIframe: false,
			enableLogging: true,
			silentCheckSsoFallback: false
		});
	});

	$: isBoardLayout = BOARD_ROUTES.includes($page.url.pathname);

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
		<main class:board-layout={isBoardLayout}>
			<slot />
		</main>
	</div>
{/key}

<style>
	div {
		display: flex;
		padding-top: var(--nav-height);
		height: 100vh;
		width: 100%;
	}

	main {
		flex-grow: 1;
		background-color: white;
		min-width: 0;
		padding: 1rem;
	}

	main.board-layout {
		display: flex;
		padding: 0;
	}
</style>
