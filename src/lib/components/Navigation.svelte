<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MenuCloseIcon from '$lib/icons/MenuCloseIcon.svelte';
	import MenuOpenIcon from '$lib/icons/MenuOpenIcon.svelte';
	import logo from '$lib/assets/logo.png';
	import { navigationToggle } from '$lib/stores';

	function toggle() {
		navigationToggle.update((v) => !v);
	}
</script>

<nav>
	<a class="logo" href="/">
		<img src={logo} alt={$_('home')} />
	</a>

	<ul class="button-group button-group-boards">
		<li><button>{$_('strategies')}</button></li>
		<li><button>{$_('objectives')}</button></li>
		<li><button>{$_('measures')}</button></li>
	</ul>

	<button
		class="menu"
		on:click={toggle}
		aria-controls="aside-0"
		aria-expanded={$navigationToggle}
		aria-label={$navigationToggle ? $_('close_sidebar') : $_('open_sidebar')}
	>
		{#if $navigationToggle}
			<MenuCloseIcon class="icon-32" />
		{:else}
			<MenuOpenIcon class="icon-32" />
		{/if}
	</button>

	<ul class="user-menu">
		<li><a href="/">{$_('login')}</a></li>
		<li><a href="/register" class="button primary">{$_('register')}</a></li>
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
