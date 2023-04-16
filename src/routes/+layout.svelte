<script lang="ts">
	import { _ } from 'svelte-i18n';
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
</script>

<svelte:head>
	<title>{$_('page_title')}</title>
</svelte:head>

<Navigation />
<div>
	<Sidebar />
	<main>
		<slot />
	</main>
</div>

<style>
	div {
		display: flex;
		padding-top: var(--nav-height);
		min-height: 100vh;
		width: 100%;
	}

	main {
		flex-grow: 1;
		background-color: var(--color-gray-100);
		overflow: scroll;
		padding: 1rem;
	}
</style>
