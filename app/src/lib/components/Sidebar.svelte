<script lang="ts" module>
	let sidebarExpanded: boolean | undefined = $state(undefined);
</script>

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
	import ProfileSettingsDialog from '$lib/components/ProfileSettingsDialog.svelte';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo.svg';
	import type { OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';
	import { user } from '$lib/stores';

	const userMenu = createDisclosure({ label: $_('user_menu') });

	const platformMenu = createDisclosure({ label: $_('platform_menu') });

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	function expandSidebar() {
		sidebarExpanded = true;
	}

	function collapseSidebar() {
		sidebarExpanded = false;
	}

	function landingPageURL(container: OrganizationContainer | OrganizationalUnitContainer) {
		const url = new URL(env.PUBLIC_BASE_URL);

		if ('default' in container.payload && container.payload.default) {
			url.pathname = '/all/page';
			return url.toString();
		} else {
			url.hostname = `${container.guid}.${url.hostname}`;
			url.pathname = '/all/page';
			return url.toString();
		}
	}
</script>

<header class:collapsed={sidebarExpanded === false} class:expanded={sidebarExpanded === true}>
	<a href={landingPageURL(page.data.currentOrganization)}>
		<img
			class="logo"
			src={page.data.currentOrganization.payload.image ?? logo}
			alt={page.data.currentOrganization.payload.name}
		/>
	</a>

	<button
		class="action-button action-button--size-s action-button--padding-tight"
		onclick={collapseSidebar}
		type="button"
	>
		<ChevronDoubleLeft />
		<span class="is-visually-hidden">{$_('collapse_sidebar')}</span>
	</button>

	<button
		class="action-button action-button--size-s action-button--padding-tight"
		onclick={expandSidebar}
		type="button"
	>
		<Bars />
		<span class="is-visually-hidden">{$_('expand_sidebar')}</span>
	</button>
</header>

<ul
	class="sidebar-menu sidebar-menu--navigation"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
	data-sveltekit-preload-data="hover"
>
	<li>
		<a
			class="sidebar-menu-item"
			class:sidebar-menu-item--active={landingPageURL(
				page.data.currentOrganizationalUnit ?? page.data.currentOrganization
			) === page.url.toString()}
			href={landingPageURL(page.data.currentOrganizationalUnit ?? page.data.currentOrganization)}
		>
			<Home />
			<span>
				{(page.data.currentOrganizationalUnit ?? page.data.currentOrganization).payload.name}
			</span>
		</a>
	</li>
	{#if $user.isAuthenticated}
		<li>
			<a
				class="sidebar-menu-item"
				class:sidebar-menu-item--active={'/me' === page.url.pathname}
				href="/me"
			>
				<Grid />
				<span>{$_('workspace.profile')}</span>
			</a>
		</li>
	{/if}
</ul>

<ul
	class="sidebar-menu sidebar-menu--about"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
>
	<li>
		<button class="sidebar-menu-item sidebar-menu-item--about" use:platformMenu.button>
			<Favicon />
			<span>
				{$_('about')}
			</span>
			{#if $platformMenu.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>
	</li>
	{#if $platformMenu.expanded}
		<li use:platformMenu.panel>
			<ul class="sidebar-menu">
				<li>
					<a class="sidebar-menu-item sidebar-menu-item--secondary" href={env.PUBLIC_BASE_URL}>
						{$_('homepage')}
					</a>
				</li>
				<li>
					<a
						class="sidebar-menu-item sidebar-menu-item--secondary"
						href="{env.PUBLIC_BASE_URL}/impressum"
					>
						{$_('imprint')}
					</a>
				</li>
			</ul>
		</li>
	{/if}
	<li>
		<a class="sidebar-menu-item" href={env.PUBLIC_BASE_URL}>
			<Favicon />
			<span>{$_('homepage')}</span>
		</a>
	</li>
</ul>

{#if $userMenu.expanded}
	<ul
		class="sidebar-menu"
		class:collapsed={sidebarExpanded === false}
		class:expanded={sidebarExpanded === true}
		transition:slide={{ duration: 125, easing: cubicInOut }}
		use:userMenu.panel
	>
		<li>
			<button class="sidebar-menu-item" onclick={() => dialog.showModal()} type="button">
				<Cog />
				<span>
					{$_('profile.settings')}
				</span>
			</button>
		</li>
		<li>
			<button
				class="sidebar-menu-item sidebar-menu-item--logout"
				onclick={() => signOut()}
				type="button"
			>
				<ArrowRightToBracket />
				<span>{$_('logout')}</span>
			</button>
		</li>
	</ul>
{/if}

{#if $user.isAuthenticated}
	<button class="dropdown-button" type="button" use:userMenu.button>
		<span
			class="avatar avatar-s"
			class:collapsed={sidebarExpanded === false}
			class:expanded={sidebarExpanded === true}
		>
			{$user.givenName.at(0)}{$user.familyName.at(0)}
		</span>
		<strong class="truncated">{$user.givenName} {$user.familyName}</strong>
		<ChevronSort />
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
		height: var(--header-height);
		justify-content: space-between;
		padding: 0.5rem 0.5rem;
	}

	header:not(.expanded) a {
		display: none;
	}

	header img {
		margin-left: 0.25rem;
	}

	header:not(.expanded) > button:first-of-type {
		display: none;
	}

	header.expanded > button:last-of-type {
		display: none;
	}

	.avatar {
		background-color: var(--color-gray-100);
	}

	.avatar:not(.expanded) ~ :global(*) {
		display: none;
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

	.sidebar-menu.sidebar-menu--about.expanded > li:last-child {
		display: none;
	}

	.sidebar-menu.sidebar-menu--about:not(.expanded) > li:not(:last-child) {
		display: none;
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
		line-height: 1.2;
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

	.sidebar-menu:not(.expanded) .sidebar-menu-item > span {
		display: none;
	}

	.sidebar-menu-item :global(svg) {
		color: var(--icon-color);
	}

	.sidebar-menu-item > :global(svg:first-child) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.sidebar-menu-item.sidebar-menu-item--about span {
		flex-grow: 1;
		text-align: left;
	}

	@media (min-width: 60rem) {
		header:not(.collapsed) a {
			display: block;
		}

		header:not(.collapsed) > button:first-of-type {
			display: block;
		}

		header:not(.collapsed) > button:last-of-type {
			display: none;
		}

		.sidebar-menu:not(.collapsed) .sidebar-menu-item > span {
			display: revert;
		}

		.sidebar-menu.sidebar-menu--about:not(.collapsed) > li:not(:last-child) {
			display: block;
		}

		.sidebar-menu.sidebar-menu--about:not(.collapsed) > li:last-child {
			display: none;
		}

		.avatar:not(.collapsed) ~ :global(*) {
			display: revert;
		}
	}
</style>
