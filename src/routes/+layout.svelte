<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
</script>

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
