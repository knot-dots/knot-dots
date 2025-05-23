<script lang="ts">
	import { signOut } from '@auth/sveltekit/client';
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ArrowRightToBracket from '~icons/flowbite/arrow-right-to-bracket-outline';
	import Bars from '~icons/flowbite/bars-outline';
	import ChevronDoubleLeft from '~icons/flowbite/chevron-double-left-outline';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronSort from '~icons/flowbite/chevron-sort-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import Cog from '~icons/flowbite/cog-outline';
	import Grid from '~icons/flowbite/grid-solid';
	import Home from '~icons/flowbite/home-solid';
	import Favicon from '~icons/knotdots/favicon';
	import OrganizationalUnit from '~icons/knotdots/organizational-unit';
	import ProfileSettingsDialog from '$lib/components/ProfileSettingsDialog.svelte';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo.svg';
	import type { OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';

	import { user } from '$lib/stores';

	const userMenu = createDisclosure({ label: $_('user_menu') });

	const platformMenu = createDisclosure({ label: $_('platform_menu') });

	let dialog: HTMLDialogElement;

	let sidebarExpanded = $state(true);

	function toggleSidebar() {
		sidebarExpanded = !sidebarExpanded;
	}

	function landingPageURL(container: OrganizationContainer | OrganizationalUnitContainer) {
		if ('default' in container.payload && container.payload.default) {
			return '/';
		} else {
			const url = new URL(env.PUBLIC_BASE_URL);
			url.hostname = `${container.guid}.${url.hostname}`;
			return url.toString();
		}
	}
</script>

<header transition:slide={{ duration: 125, easing: cubicInOut }}>
	{#if sidebarExpanded}
		<a href={env.PUBLIC_BASE_URL} title="knotdots.net">
			<img class="logo" src={logo} alt="knot dots Logo" />
		</a>
		<button
			class="action-button action-button--size-s action-button--padding-tight"
			onclick={toggleSidebar}
			type="button"
		>
			<ChevronDoubleLeft />
			<span class="is-visually-hidden">{$_('collapse_sidebar')}</span>
		</button>
	{:else}
		<button
			class="action-button action-button--size-s action-button--padding-tight"
			onclick={toggleSidebar}
			type="button"
		>
			<Bars />
			<span class="is-visually-hidden">{$_('expand_sidebar')}</span>
		</button>
	{/if}
</header>

<ul class="sidebar-menu sidebar-menu--navigation" data-sveltekit-preload-data="hover">
	<li>
		<a
			class="sidebar-menu-item"
			class:sidebar-menu-item--active={landingPageURL(page.data.currentOrganization) ===
				page.url.pathname}
			href={landingPageURL(page.data.currentOrganization)}
		>
			<Home />
			<span class:is-visually-hidden={!sidebarExpanded}>
				{page.data.currentOrganization.payload.name}
			</span>
		</a>
	</li>
	{#if page.data.currentOrganizationalUnit}
		<li>
			<a
				class="sidebar-menu-item"
				class:sidebar-menu-item--active={landingPageURL(page.data.currentOrganizationalUnit) ===
					page.url.pathname}
				href={landingPageURL(page.data.currentOrganizationalUnit)}
			>
				<OrganizationalUnit />
				<span class:is-visually-hidden={!sidebarExpanded}>
					{page.data.currentOrganizationalUnit.payload.name}
				</span>
			</a>
		</li>
	{/if}
	{#if $user.isAuthenticated}
		<li>
			<a
				class="sidebar-menu-item"
				class:sidebar-menu-item--active={'/me' === page.url.pathname}
				href="/me"
			>
				<Grid />
				<span class:is-visually-hidden={!sidebarExpanded}>{$_('workspace.profile')}</span>
			</a>
		</li>
	{/if}
</ul>

<ul class="sidebar-menu sidebar-menu--about">
	{#if sidebarExpanded}
		<li>
			<button class="sidebar-menu-item sidebar-menu-item--about" use:platformMenu.button>
				<Favicon />
				<span>
					{$_('about')}
					{#if $platformMenu.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
				</span>
			</button>
		</li>
		{#if $platformMenu.expanded}
			<li use:platformMenu.panel>
				<ul class="sidebar-menu">
					<li>
						<a class="sidebar-menu-item sidebar-menu-item--secondary" href={env.PUBLIC_BASE_URL}>
							knotdots.net Homepage
						</a>
					</li>
				</ul>
			</li>
		{/if}
	{:else}
		<li>
			<a class="sidebar-menu-item" href={env.PUBLIC_BASE_URL}>
				<Favicon />
				<span class="is-visually-hidden">knotdots.net Homepage</span>
			</a>
		</li>
	{/if}
</ul>

{#if $userMenu.expanded}
	<ul
		class="sidebar-menu"
		transition:slide={{ duration: 125, easing: cubicInOut }}
		use:userMenu.panel
	>
		<li>
			<button class="sidebar-menu-item" onclick={() => dialog.showModal()} type="button">
				<Cog />
				<span class:is-visually-hidden={!sidebarExpanded}>{$_('profile.settings')}</span>
			</button>
		</li>
		<li>
			<button
				class="sidebar-menu-item sidebar-menu-item--logout"
				onclick={() => signOut()}
				type="button"
			>
				<ArrowRightToBracket />
				<span class:is-visually-hidden={!sidebarExpanded}>{$_('logout')}</span>
			</button>
		</li>
	</ul>
{/if}

{#if $user.isAuthenticated}
	<button class="dropdown-button" type="button" use:userMenu.button>
		<span class="avatar avatar-s">
			{$user.givenName.at(0)}{$user.familyName.at(0)}
		</span>
		{#if sidebarExpanded}
			<strong class="truncated">{$user.givenName} {$user.familyName}</strong>
			<ChevronSort />
		{/if}
	</button>
{/if}

<ProfileSettingsDialog bind:dialog />

<style>
	header {
		align-items: center;
		border-bottom: solid 1px var(--color-gray-200);
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
		height: var(--nav-height);
		justify-content: space-between;
		padding: 0.5rem 0.5rem;
	}

	header img {
		margin-left: 0.25rem;
	}

	.avatar {
		background-color: var(--color-gray-100);
	}

	.dropdown-button {
		--button-background: transparent;

		align-items: center;
		border-radius: 0;
		display: flex;
		gap: 0.625rem;
		padding: 0.75rem 0.5rem;
	}

	.dropdown-button strong {
		font-weight: 600;
	}

	.sidebar-menu {
		border-bottom: 1px solid var(--gray-200, #e5e7eb);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem 0.5rem;
	}

	.sidebar-menu.sidebar-menu--about {
		gap: 0.25rem;
		margin-top: auto;
		padding: 0.75rem 0.5rem;
	}

	.sidebar-menu.sidebar-menu--about .sidebar-menu {
		border-bottom: none;
		gap: 0.25rem;
		padding: 0;
	}

	.sidebar-menu.sidebar-menu--navigation {
		background-color: var(--color-gray-050);
	}

	.sidebar-menu-item {
		--color: var(--color-gray-700);
		--icon-color: var(--color-gray-400);

		align-items: center;
		border: none;
		border-radius: 8px;
		color: var(--color);
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
		padding: 0.5rem;
		width: 100%;
	}

	.sidebar-menu-item.sidebar-menu-item--active {
		background-color: var(--color-gray-200);
	}

	.sidebar-menu-item.sidebar-menu-item--logout {
		--color: var(--color-red-600);
		--icon-color: var(--color-red-600);
	}

	.sidebar-menu-item.sidebar-menu-item--secondary {
		padding-left: 2.75rem;
	}

	.sidebar-menu-item:active {
		background-color: var(--color-gray-300);
	}

	.sidebar-menu-item:focus,
	.sidebar-menu-item:hover {
		background-color: var(--color-gray-100);
	}

	.sidebar-menu-item :global(svg) {
		color: var(--icon-color);
	}

	.sidebar-menu-item > :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.sidebar-menu-item.sidebar-menu-item--about span {
		flex-grow: 1;
		text-align: left;
	}

	.sidebar-menu-item.sidebar-menu-item--about :global(svg) {
		float: right;
		vertical-align: middle;
	}
</style>
