<script lang="ts">
	import type Keycloak from 'keycloak-js';
	import { onMount, setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import '../app.css';
	import { page } from '$app/stores';
	import Navigation from '$lib/components/Navigation.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { initKeycloak, key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
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

	function isBoardLayout() {
		return ['/', '/measures'].includes($page.url.pathname);
	}
</script>

<svelte:head>
	<title>{$_('page_title')}</title>
</svelte:head>

<Navigation />
<div>
	<Sidebar />
	<main class:board-layout={isBoardLayout()}>
		<slot />
	</main>
</div>

<style>
	div {
		display: flex;
		padding-top: var(--nav-height);
		height: 100vh;
		width: 100%;
	}

	main {
		flex-grow: 1;
		background-color: var(--color-gray-100);
		min-width: 0;
		padding: 1rem 1rem 0;
	}

	main.board-layout {
		display: flex;
	}
</style>
