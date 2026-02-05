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
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import Grid from '~icons/flowbite/grid-solid';
	import Home from '~icons/flowbite/home-solid';
	import StarSolid from '~icons/flowbite/star-solid';
	import Cog from '~icons/knotdots/cog';
	import ChevronSort from '~icons/knotdots/chevron-sort';
	import Favicon from '~icons/knotdots/favicon';
	import OrganizationalUnit from '~icons/knotdots/organizational-unit';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo.svg';
	import tooltip from '$lib/attachments/tooltip';
	import EditableFavorite from '$lib/components/EditableFavorite.svelte';
	import ProfileSettingsDialog from '$lib/components/ProfileSettingsDialog.svelte';
	import {
		getOrganizationURL,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import { user } from '$lib/stores';
	import transformFileURL from '$lib/transformFileURL';

	let currentOrganization = $derived.by(() => {
		let _ = $state(page.data.currentOrganization);
		return _;
	});

	let currentOrganizationalUnit = $derived.by(() => {
		let _ = $state(page.data.currentOrganizationalUnit);
		return _;
	});

	const userMenu = createDisclosure({ label: $_('user_menu') });

	const organizationMenu = createDisclosure({ label: $_('organization_menu'), expanded: true });

	const organizationalUnitMenu = createDisclosure({
		label: $_('organizational_unit_menu'),
		expanded: true
	});

	const platformMenu = createDisclosure({ label: $_('platform_menu'), expanded: true });

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	function expandSidebar() {
		sidebarExpanded = true;
	}

	function collapseSidebar() {
		sidebarExpanded = false;
	}

	function landingPageURL(container: OrganizationContainer | OrganizationalUnitContainer) {
		return getOrganizationURL(container, '/all/page', env).toString();
	}
</script>

<header class:collapsed={sidebarExpanded === false} class:expanded={sidebarExpanded === true}>
	<a href={landingPageURL(page.data.currentOrganization)}>
		<img
			class="logo"
			src={page.data.currentOrganization.payload.image
				? transformFileURL(page.data.currentOrganization.payload.image)
				: logo}
			alt={page.data.currentOrganization.payload.name}
		/>
	</a>

	<button class="action-button" onclick={collapseSidebar} type="button">
		<ChevronDoubleLeft />
		<span class="is-visually-hidden">{$_('collapse_sidebar')}</span>
	</button>

	<button class="action-button" onclick={expandSidebar} type="button">
		<Bars />
		<span class="is-visually-hidden">{$_('expand_sidebar')}</span>
	</button>
</header>

<ul
	class="sidebar-menu"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
	data-sveltekit-preload-data="hover"
>
	<li>
		<button class="sidebar-menu-item sidebar-menu-item--toggle" use:organizationMenu.button>
			{#if $organizationMenu.expanded}<ChevronDown />{:else}<ChevronUp />{/if}
			<span>
				{page.data.currentOrganization.payload.name}
			</span>
		</button>
	</li>

	{#if $organizationMenu.expanded}
		<li use:organizationMenu.panel>
			<ul class="sidebar-menu">
				<li>
					<a
						class="sidebar-menu-item sidebar-menu-item--secondary"
						class:sidebar-menu-item--active={landingPageURL(page.data.currentOrganization) ===
							page.url.toString()}
						href={landingPageURL(page.data.currentOrganization)}
					>
						<Home />
						<span>
							{$_('landing_page')}
						</span>
					</a>
				</li>

				{#each currentOrganization.payload.favorite as favorite, index (favorite.href)}
					{@const href = page.url.searchParams.size
						? `${page.url.pathname}?${page.url.searchParams.toString()}`
						: page.url.pathname}
					<li>
						<a
							class="sidebar-menu-item sidebar-menu-item--secondary"
							class:sidebar-menu-item--active={favorite.href === href}
							href={favorite.href}
						>
							{#if favorite.icon}
								<img alt="" class="favorite-icon" src={transformFileURL(favorite.icon)} />
							{:else}
								<StarSolid />
							{/if}

							<span>{favorite.title}</span>
						</a>
						<EditableFavorite bind:container={currentOrganization} {index} />
					</li>
				{/each}
			</ul>
		</li>
	{/if}

	<li>
		<a
			{@attach tooltip($_('landing_page'))}
			class="sidebar-menu-item sidebar-menu-item--collapsed"
			class:sidebar-menu-item--active={landingPageURL(currentOrganization) === page.url.toString()}
			href={landingPageURL(currentOrganization)}
		>
			<Home />
		</a>
	</li>
</ul>

{#if currentOrganizationalUnit}
	<ul
		class="sidebar-menu"
		class:collapsed={sidebarExpanded === false}
		class:expanded={sidebarExpanded === true}
		data-sveltekit-preload-data="hover"
	>
		<li>
			<button class="sidebar-menu-item sidebar-menu-item--toggle" use:organizationalUnitMenu.button>
				{#if $organizationalUnitMenu.expanded}<ChevronDown />{:else}<ChevronUp />{/if}
				<span>
					{currentOrganizationalUnit.payload.name}
				</span>
			</button>
		</li>

		{#if $organizationalUnitMenu.expanded}
			<li use:organizationalUnitMenu.panel>
				<ul class="sidebar-menu">
					<li>
						<a
							class="sidebar-menu-item sidebar-menu-item--secondary"
							class:sidebar-menu-item--active={landingPageURL(page.data.currentOrganization) ===
								page.url.toString()}
							href={landingPageURL(page.data.currentOrganization)}
						>
							<OrganizationalUnit />
							<span>
								{$_('overview')}
							</span>
						</a>
					</li>

					{#each currentOrganizationalUnit.payload.favorite as favorite, index (favorite.href)}
						{@const href = page.url.searchParams.size
							? `${page.url.pathname}?${page.url.searchParams.toString()}`
							: page.url.pathname}
						<li>
							<a
								class="sidebar-menu-item sidebar-menu-item--secondary"
								class:sidebar-menu-item--active={favorite.href === href}
								href={favorite.href}
							>
								{#if favorite.icon}
									<img alt="" class="favorite-icon" src={transformFileURL(favorite.icon)} />
								{:else}
									<StarSolid />
								{/if}

								<span>{favorite.title}</span>
							</a>
							<EditableFavorite bind:container={currentOrganizationalUnit} {index} />
						</li>
					{/each}
				</ul>
			</li>
		{/if}

		<li>
			<a
				{@attach tooltip($_('overview'))}
				class="sidebar-menu-item sidebar-menu-item--collapsed"
				class:sidebar-menu-item--active={landingPageURL(currentOrganizationalUnit) ===
					page.url.toString()}
				href={landingPageURL(currentOrganizationalUnit)}
			>
				<OrganizationalUnit />
			</a>
		</li>
	</ul>
{/if}

<ul
	class="sidebar-menu"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
	data-sveltekit-preload-data="hover"
>
	{#if $user.isAuthenticated}
		<li>
			<a
				class="sidebar-menu-item sidebar-menu-item--secondary"
				class:sidebar-menu-item--active={'/me' === page.url.pathname}
				href="/me"
			>
				<Grid />
				<span>{$_('workspace.profile')}</span>
			</a>
		</li>

		<li>
			<a
				{@attach tooltip($_('workspace.profile'))}
				class="sidebar-menu-item sidebar-menu-item--collapsed"
				class:sidebar-menu-item--active={'/me' === page.url.pathname}
				href="/me"
			>
				<Grid />
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
		<button class="sidebar-menu-item sidebar-menu-item--toggle" use:platformMenu.button>
			{#if $platformMenu.expanded}<ChevronDown />{:else}<ChevronUp />{/if}
			<span>
				{$_('about')}
			</span>
		</button>
	</li>
	{#if $platformMenu.expanded}
		<li use:platformMenu.panel>
			<ul class="sidebar-menu">
				<li>
					<a
						class="sidebar-menu-item sidebar-menu-item--secondary"
						href={env.PUBLIC_BASE_URL}
						rel="external"
					>
						{$_('homepage')}
					</a>
				</li>
				<li>
					<a
						class="sidebar-menu-item sidebar-menu-item--secondary"
						href="{env.PUBLIC_BASE_URL}/impressum"
						rel="external"
					>
						{$_('imprint')}
					</a>
				</li>
				<li>
					<a
						class="sidebar-menu-item sidebar-menu-item--secondary"
						href="{env.PUBLIC_BASE_URL}/datenschutz"
						rel="external"
					>
						{$_('privacy_policy')}
					</a>
				</li>
			</ul>
		</li>
	{/if}
	<li>
		<a
			{@attach tooltip($_('homepage'))}
			class="sidebar-menu-item sidebar-menu-item--collapsed"
			href={env.PUBLIC_BASE_URL}
		>
			<Favicon />
		</a>
	</li>
</ul>

{#if $userMenu.expanded}
	<ul
		class="sidebar-menu sidebar-menu--profile"
		class:collapsed={sidebarExpanded === false}
		class:expanded={sidebarExpanded === true}
		transition:slide={{ duration: 125, easing: cubicInOut }}
		use:userMenu.panel
	>
		<li>
			<button
				aria-label={$_('profile.settings')}
				class="sidebar-menu-item"
				onclick={() => dialog.showModal()}
				type="button"
			>
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
		<li>
			<button
				{@attach tooltip($_('profile.settings'))}
				class="sidebar-menu-item sidebar-menu-item--collapsed"
				onclick={() => dialog.showModal()}
				type="button"
			>
				<Cog />
			</button>
		</li>
		<li>
			<button
				{@attach tooltip($_('logout'))}
				class="sidebar-menu-item sidebar-menu-item--collapsed sidebar-menu-item--logout"
				onclick={() => signOut()}
				type="button"
			>
				<ArrowRightToBracket />
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

	header.expanded {
		width: var(--sidebar-max-width);
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
		--dropdown-button-default-background: transparent;
		--dropdown-button-icon-size: 1rem;
		--dropdown-button-chevron-icon-size: 1rem;

		align-items: center;
		border-radius: 0;
		border-top: 1px solid var(--color-gray-200);
		display: flex;
		gap: 0.625rem;
		padding: 0.75rem 0.5rem;
	}

	.dropdown-button strong {
		font-weight: 600;
	}

	.favorite-icon {
		height: 1rem;
		width: 1rem;
	}

	.sidebar-menu {
		display: flex;
		flex-direction: column;
		padding: 0.75rem 0.5rem 0.5rem;
	}

	.sidebar-menu.sidebar-menu--about {
		margin-bottom: auto;
	}

	.sidebar-menu.sidebar-menu--about .sidebar-menu-item--secondary {
		padding-left: 1.875rem;
	}

	.sidebar-menu.sidebar-menu--profile {
		border-top: 1px solid var(--color-gray-200);
		padding-top: 0.5rem;
	}

	.sidebar-menu > li {
		gap: 0.375rem;
	}

	.sidebar-menu.expanded > li:has(> .sidebar-menu-item--collapsed) {
		display: none;
	}

	.sidebar-menu:not(.expanded) > li:not(:has(> .sidebar-menu-item--collapsed)) {
		display: none;
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
		flex-grow: 1;
		gap: 0.375rem;
		line-height: 1.5;
		max-width: 100%;
		min-width: 0;
		padding: 0.25rem;
		text-wrap: nowrap;
	}

	.sidebar-menu-item.sidebar-menu-item--toggle {
		--color: var(--color-gray-400);

		font-size: 0.75rem;
		gap: 0.125rem;
		padding-left: 0;
	}

	.sidebar-menu-item.sidebar-menu-item--active {
		background-color: var(--color-gray-100);
	}

	.sidebar-menu-item.sidebar-menu-item--logout {
		--color: var(--color-red-600);
		--icon-color: var(--color-red-600);
	}

	.sidebar-menu-item.sidebar-menu-item--secondary {
		padding-left: 0.5rem;
	}

	.sidebar-menu-item.sidebar-menu-item--collapsed {
		padding: 0.5rem;
	}

	.sidebar-menu-item:active {
		background-color: var(--color-gray-100);
	}

	.sidebar-menu-item:focus,
	.sidebar-menu-item:hover {
		background-color: var(--color-gray-050);
	}

	.sidebar-menu .sidebar-menu {
		flex-grow: 1;
		padding: 0;
	}

	.sidebar-menu-item > span {
		overflow: hidden;
		text-align: left;
		text-overflow: ellipsis;
	}

	.sidebar-menu:not(.expanded) .sidebar-menu-item > span {
		display: none;
	}

	.sidebar-menu-item :global(svg) {
		color: var(--icon-color);
		flex-shrink: 0;
		height: 1rem;
		max-width: none;
		width: 1rem;
	}

	@media (hover: hover) {
		li:hover > :global(.is-visible-on-hover) {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;

			display: block;
		}
	}

	@media (min-width: 60rem) {
		header:not(.collapsed) {
			width: var(--sidebar-max-width);
		}

		header:not(.collapsed) a {
			display: block;
		}

		header:not(.collapsed) > button:first-of-type {
			display: block;
		}

		header:not(.collapsed) > button:last-of-type {
			display: none;
		}

		.sidebar-menu:not(.collapsed) {
			max-width: var(--sidebar-max-width);
		}

		.sidebar-menu:not(.collapsed) .sidebar-menu {
			max-width: 100%;
		}

		.sidebar-menu:not(.collapsed) .sidebar-menu-item > span {
			display: revert;
		}

		.sidebar-menu:not(.collapsed) > li:not(:has(> .sidebar-menu-item--collapsed)) {
			display: flex;
		}

		.sidebar-menu:not(.collapsed) > li:has(> .sidebar-menu-item--collapsed) {
			display: none;
		}

		.avatar:not(.collapsed) ~ :global(*) {
			display: revert;
		}
	}
</style>
