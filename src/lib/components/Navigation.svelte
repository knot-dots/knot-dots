<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import logo1 from '$lib/assets/logo-1.svg';
	import logo2 from '$lib/assets/logo-2.svg';
	import logo3 from '$lib/assets/logo-3.svg';
	import MenuCloseIcon from '$lib/icons/MenuCloseIcon.svelte';
	import MenuOpenIcon from '$lib/icons/MenuOpenIcon.svelte';
	import OrganizationMenu from '$lib/components/OrganizationMenu.svelte';
	import { boards } from '$lib/models';
	import { navigationToggle, user } from '$lib/stores';

	const logos = [logo1, logo2, logo3];
	const randomLogo = logos[Math.floor($page.data.random * logos.length)];

	$: selectedContext = $page.data.currentOrganizationalUnit ?? $page.data.currentOrganization;

	function toggle() {
		navigationToggle.update((v) => !v);
	}
</script>

<nav>
	<OrganizationMenu />

	<div class="main-menu">
		<a href="/" class="button button-nav" class:is-active={$page.url.pathname === '/'}>
			{$_('board.elements')}
		</a>

		<ul class="button-group button-group-nav">
			{#if selectedContext.payload.boards.includes(boards.enum['board.indicators'])}
				<li>
					<a
						href="/indicators"
						class="button button-nav"
						class:is-active={$page.url.pathname === '/indicators'}
					>
						{$_('board.indicators')}
					</a>
				</li>
			{/if}
			<li>
				<a
					href="/programs"
					class="button button-nav"
					class:is-active={$page.url.pathname === '/programs'}
				>
					{$_('board.programs')}
				</a>
			</li>
			<li>
				<a
					href="/implementation"
					class="button button-nav"
					class:is-active={$page.url.pathname === '/implementation'}
				>
					{$_('board.implementation')}
				</a>
			</li>
			{#if !$page.data.currentOrganization.payload.default}
				<li>
					<a
						href="/tasks"
						class="button button-nav"
						class:is-active={$page.url.pathname === '/tasks'}
					>
						{$_('tasks')}
					</a>
				</li>
			{/if}
		</ul>
	</div>

	<ul class="user-menu" class:is-authenticated={$user.isAuthenticated}>
		{#if $user.isAuthenticated}
			<li>
				<a href="/profile">
					<span
						class="avatar avatar-s button button-nav"
						class:is-active={$page.url.pathname === '/profile'}
					>
						{$user.givenName.at(0)}{$user.familyName.at(0)}
					</span>
				</a>
			</li>
		{:else}
			<li>
				<button class="button-nav fully-rounded" type="button" on:click={() => signIn('keycloak')}>
					{$_('login')}
				</button>
			</li>
		{/if}
	</ul>

	<a href="/about">
		<img alt={$_('logo')} class="logo" src={randomLogo} />
	</a>

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
		padding: 0 16px;
		position: absolute;
		width: 100%;
		z-index: 1;
	}

	nav > * {
		margin: 0;
	}

	.main-menu {
		display: flex;
		flex-grow: 0;
		gap: 2rem;
		margin: 0 auto;
		overflow-x: auto;
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
</style>
