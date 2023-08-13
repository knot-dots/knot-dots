<script lang="ts">
	import { ChevronDown, ChevronUp, Icon } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import MenuCloseIcon from '$lib/icons/MenuCloseIcon.svelte';
	import MenuOpenIcon from '$lib/icons/MenuOpenIcon.svelte';
	import logo from '$lib/assets/logo.png';
	import type { OrganizationContainer } from '$lib/models';
	import { keycloak, navigationToggle, user } from '$lib/stores';

	function toggle() {
		navigationToggle.update((v) => !v);
	}

	let organizationToggle = false;

	function organizationURL(container: OrganizationContainer) {
		const url = new URL(env.PUBLIC_BASE_URL ?? '');
		if (!container.payload.default) {
			url.hostname = `${container.payload.slug}.${url.hostname}`;
		}
		url.pathname = `/organization/${container.guid}`;
		return url.toString();
	}
</script>

<nav>
	<button
		class="quiet organization-menu-toggle"
		type="button"
		on:click={() => (organizationToggle = !organizationToggle)}
		aria-controls="organization-menu"
		aria-expanded={organizationToggle}
		aria-label={organizationToggle ? $_('close_organization_menu') : $_('open_organization_menu')}
	>
		<img
			alt={$_('home')}
			src={$page.data.currentOrganization?.payload.image
				? $page.data.currentOrganization.payload.image
				: logo}
		/>
		<span
			>{$page.data.currentOrganization
				? $page.data.currentOrganization.payload.name
				: 'knotdots.net'}</span
		>
		<Icon src={organizationToggle ? ChevronUp : ChevronDown} size="20" mini />
		<ul class:is-expanded={organizationToggle} class="organization-menu" id="organization-menu">
			{#each $page.data.organizations ?? [] as container}
				<li>
					<a href={organizationURL(container)}>{container.payload.name}</a>
				</li>
			{/each}
			<li>
				<a href="/organizations">{$_('organizations')}</a>
			</li>
		</ul>
	</button>

	<ul class="button-group button-group-boards">
		<li>
			<a
				href="/organizations"
				class="button"
				class:is-active={$page.url.pathname == '/organizations'}
			>
				{$_('organizations')}
			</a>
		</li>
		<li>
			<a href="/strategies" class="button" class:is-active={$page.url.pathname == '/strategies'}>
				{$_('strategies')}
			</a>
		</li>
		<li>
			<a href="/" class="button" class:is-active={$page.url.pathname == '/'}>
				{$_('objectives')}
			</a>
		</li>
		<li>
			<a href="/measures" class="button" class:is-active={$page.url.pathname == '/measures'}>
				{$_('measures')}
			</a>
		</li>
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
		box-shadow:
			0px 4px 6px -1px rgba(0, 0, 0, 0.1),
			0px 2px 4px -2px rgba(0, 0, 0, 0.05);
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

	.organization-menu-toggle {
		align-items: center;
		flex-shrink: 0;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem 0.25rem 0.25rem;
		position: relative;
	}

	.organization-menu-toggle:active {
		background-color: inherit;
	}

	.organization-menu-toggle > img {
		width: 52px;
	}

	.organization-menu-toggle span {
		border-right: solid 1px var(--color-gray-200);
		padding-right: 0.75rem;
	}

	.organization-menu {
		background-color: white;
		border: 1px solid var(--color-gray-300);
		border-radius: 0.375rem;
		box-shadow: var(--shadow-lg);
		display: none;
		left: 0;
		max-width: 14rem;
		position: absolute;
		top: 2.75rem;
		width: fit-content;
	}

	.organization-menu.is-expanded {
		display: initial;
	}

	.organization-menu li a {
		display: block;
		padding: 0.5rem 1rem;
		text-align: left;
		white-space: nowrap;
	}

	.organization-menu li a:hover {
		background-color: var(--color-gray-300);
	}

	.button-group.button-group-boards {
		display: flex;
		margin: 0 auto;
		overflow-y: scroll;
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
