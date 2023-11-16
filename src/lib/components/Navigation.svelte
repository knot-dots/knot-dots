<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import MenuCloseIcon from '$lib/icons/MenuCloseIcon.svelte';
	import MenuOpenIcon from '$lib/icons/MenuOpenIcon.svelte';
	import OrganizationMenu from '$lib/components/OrganizationMenu.svelte';
	import { navigationToggle, user } from '$lib/stores';

	function toggle() {
		navigationToggle.update((v) => !v);
	}
</script>

<nav>
	<OrganizationMenu />

	<ul class="button-group button-group-boards">
		<li>
			<a
				href="/organizations"
				class="button"
				class:is-active={$page.url.pathname === '/organizations'}
			>
				{$_('organizations')}
			</a>
		</li>
		<li>
			<a href="/strategies" class="button" class:is-active={$page.url.pathname === '/strategies'}>
				{$_('strategies')}
			</a>
		</li>
		<li>
			<a href="/" class="button" class:is-active={$page.url.pathname === '/'}>
				{$_('objectives')}
			</a>
		</li>
		<li>
			<a href="/measures" class="button" class:is-active={$page.url.pathname === '/measures'}>
				{$_('measures')}
			</a>
		</li>
	</ul>

	<ul class="user-menu" class:is-authenticated={$user.isAuthenticated}>
		{#if $user.isAuthenticated}
			<li>
				<a href="/profile">
					<span class="avatar avatar-s">{$user.givenName.at(0)}{$user.familyName.at(0)}</span>
				</a>
			</li>
		{:else}
			<li>
				<button class="quiet" type="button" on:click={() => signIn('keycloak')}>
					{$_('login')}
				</button>
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
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.05);
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		height: var(--nav-height);
		justify-content: space-between;
		padding: 0 16px;
		position: absolute;
		width: 100%;
		z-index: 2;
	}

	nav > * {
		margin: 0;
	}

	.button-group.button-group-boards {
		display: flex;
		margin: 0 auto;
		overflow-y: auto;
	}

	.button-group.button-group-boards li:nth-child(1) {
		display: none;
	}

	.button-group.button-group-boards li:nth-child(2) {
		border-bottom-left-radius: 6px;
		border-top-left-radius: 6px;
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
		--button-background: transparent;
	}

	@media (min-width: 768px) {
		nav {
			gap: 1.5rem;
		}

		.user-menu {
			display: flex;
		}

		.user-menu.is-authenticated > li:last-child {
			display: initial;
		}

		.menu {
			display: none;
		}
	}

	@media (min-width: 1440px) {
		.button-group.button-group-boards li:nth-child(1) {
			display: initial;
		}

		.button-group.button-group-boards li:nth-child(2) {
			border-bottom-left-radius: 0;
			border-top-left-radius: 0;
		}
	}
</style>
