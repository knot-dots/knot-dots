<script lang="ts">
	import MenuCloseIcon from '$lib/MenuCloseIcon.svelte';
	import MenuOpenIcon from '$lib/MenuOpenIcon.svelte';
	import logo from '$lib/assets/logo.png';
	import { navigationToggle } from '$lib/stores';

	function toggle() {
		navigationToggle.update((v) => !v);
	}
</script>

<nav>
	<a class="logo" href="/">
		<img src={logo} alt="knot dots logo" />
	</a>

	<ul class="button-group button-group-boards" class:is-visible={$navigationToggle}>
		<li><button>Strategies</button></li>
		<li><button>Objectives</button></li>
		<li><button>Measures</button></li>
	</ul>

	<button class="menu" on:click={toggle}>
		{#if $navigationToggle}
			<MenuCloseIcon class="icon-32" />
		{:else}
			<MenuOpenIcon class="icon-32" />
		{/if}
	</button>

	<ul class="user-menu">
		<li><a href="/">Log in</a></li>
		<li><a href="/register" class="button primary">Register</a></li>
	</ul>
</nav>

<style>
	nav {
		align-items: center;
		box-shadow: 0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.05);
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		height: var(--nav-height);
		justify-content: space-between;
		padding: 0 16px;
		position: absolute;
		width: 100%;
		z-index: 1;
	}

	nav > * {
		margin: 0;
	}

	.logo {
		flex-shrink: 0;
	}

	.logo > img {
		width: 52px;
	}

	.button-group.button-group-boards {
		display: flex;
		margin-top: 0;
		overflow-y: scroll;
	}

	.button-group.button-group-boards.is-visible {
		display: flex;
	}

	.user-menu {
		display: none;
		list-style: none;
		justify-content: space-between;
		gap: 1rem;
	}

	.menu {
		border: none;
		padding: 0;
	}

	.menu:hover {
		--bg-color: transparent;
	}

	@media (min-width: 768px) {
		nav {
			gap: 1.5rem;
		}

		.user-menu {
			display: flex;
		}

		.menu {
			display: none;
		}
	}
</style>
