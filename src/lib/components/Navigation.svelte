<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MenuCloseIcon from '$lib/icons/MenuCloseIcon.svelte';
	import MenuOpenIcon from '$lib/icons/MenuOpenIcon.svelte';
	import logo from '$lib/assets/logo.png';
	import { keycloak, navigationToggle, user } from '$lib/stores';

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

	<ul class="user-menu" class:is-authenticated={$user.isAuthenticated}>
		{#if $user.isAuthenticated}
			<li>
				<a href={$keycloak.accountUrl}>
					<span class="avatar avatar-s">{$user.givenName.at(0)}{$user.familyName.at(0)}</span>
				</a>
			</li>
			<li>
				<a href={$keycloak.logoutUrl} class="button quiet">{$_('logout')}</a>
			</li>
		{:else}
			<li><a href={$keycloak.loginUrl} class="button quiet">{$_('login')}</a></li>
			<li>
				<a href={$keycloak.registerUrl} class="button primary">{$_('register')}</a>
			</li>
		{/if}
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
		margin: 0 auto;
		overflow-y: scroll;
	}

	.user-menu {
		display: none;
		gap: 1rem;
	}

	.user-menu.is-authenticated {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.user-menu.is-authenticated > li:last-child {
		display: none;
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

		.user-menu.is-authenticated > li:first-child {
			border-right: solid 1px var(--color-gray-200);
			padding-right: 12px;
		}

		.user-menu.is-authenticated > li:last-child {
			display: initial;
		}

		.menu {
			display: none;
		}
	}
</style>
