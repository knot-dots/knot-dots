<script lang="ts" module>
	let sidebarExpanded: boolean | undefined = $state(undefined);
</script>

<script lang="ts">
	import { signOut } from '@auth/sveltekit/client';
	import { getContext } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';
	import { type DndEvent, dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ArrowRightToBracket from '~icons/flowbite/arrow-right-to-bracket-outline';
	import Bars from '~icons/flowbite/bars-outline';
	import ChevronDoubleLeft from '~icons/flowbite/chevron-double-left-outline';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import Grid from '~icons/flowbite/grid-solid';
	import Home from '~icons/flowbite/home-solid';
	import StarSolid from '~icons/flowbite/star-solid';
	import Cog from '~icons/knotdots/cog';
	import ChevronSort from '~icons/knotdots/chevron-sort';
	import DragHandle from '~icons/knotdots/draghandle';
	import Favicon from '~icons/knotdots/favicon';
	import OrganizationalUnit from '~icons/knotdots/organizational-unit';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo.svg';
	import tooltip from '$lib/attachments/tooltip';
	import saveContainer from '$lib/client/saveContainer';
	import EditableFavorite from '$lib/components/EditableFavorite.svelte';
	import ProfileSettingsDialog from '$lib/components/ProfileSettingsDialog.svelte';
	import { type Favorite, getFavoriteListContext } from '$lib/contexts/favoriteList';
	import {
		getOrganizationURL,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import { user } from '$lib/stores';
	import transformFileURL from '$lib/transformFileURL';
	import { ability, applicationState } from '$lib/stores';

	let favoriteList = getFavoriteListContext();

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

	const mobileMenu: { open: boolean; toggle: () => void; close: () => void } | undefined =
		getContext('mobileMenu');

	$effect(() => {
		if (mobileMenu?.open) {
			sidebarExpanded = true;
		}
	});

	function updateFavorite(
		container: OrganizationContainer | OrganizationalUnitContainer,
		favorite: Favorite[]
	) {
		return async () => {
			const response = await saveContainer({
				...container,
				payload: {
					...container.payload,
					favorite
				}
			});
			if (response.ok) {
				const updatedContainer = await response.json();
				container.revision = updatedContainer.revision;
			} else {
				const error = await response.json();
				alert(error.message);
			}
		};
	}

	let favoriteItemsOrganization = $derived(
		favoriteList.organization.map((favorite) => ({
			...favorite,
			guid: favorite.href
		}))
	);

	let favoriteItemsOrganizationalUnit = $derived(
		favoriteList.organizationalUnit.map((favorite) => ({
			...favorite,
			guid: favorite.href
		}))
	);

	function handleDndConsiderOrganization(
		event: CustomEvent<DndEvent<Favorite & { guid: string }>>
	) {
		favoriteItemsOrganization = event.detail.items;
	}

	function handleDndFinalizeOrganization(
		event: CustomEvent<DndEvent<Favorite & { guid: string }>>
	) {
		favoriteItemsOrganization = event.detail.items;
		favoriteList.organization = favoriteItemsOrganization.map(({ href, icon, title }) => ({
			href,
			icon,
			title
		}));
		updateFavorite(page.data.currentOrganization, favoriteList.organization)();
	}

	function handleDndConsiderOrganizationalUnit(
		event: CustomEvent<DndEvent<Favorite & { guid: string }>>
	) {
		favoriteItemsOrganizationalUnit = event.detail.items;
	}

	function handleDndFinalizeOrganizationalUnit(
		event: CustomEvent<DndEvent<Favorite & { guid: string }>>
	) {
		favoriteItemsOrganizationalUnit = event.detail.items;
		favoriteList.organizationalUnit = favoriteItemsOrganizationalUnit.map(
			({ href, icon, title }) => ({
				href,
				icon,
				title
			})
		);
		updateFavorite(page.data.currentOrganizationalUnit!, favoriteList.organizationalUnit)();
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

	<button
		class="action-button collapse-button"
		onclick={() => {
			collapseSidebar();
			mobileMenu?.close();
		}}
		type="button"
	>
		<ChevronDoubleLeft />
		<span class="is-visually-hidden">{$_('collapse_sidebar')}</span>
	</button>

	<button class="action-button" onclick={expandSidebar} type="button">
		<Bars />
		<span class="is-visually-hidden">{$_('expand_sidebar')}</span>
	</button>
</header>

<ul
	class="sidebar-menu collapsible"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
	data-sveltekit-preload-data="hover"
>
	<li>
		<button class="sidebar-menu-item sidebar-menu-item--toggle" use:organizationMenu.button>
			{#if $organizationMenu.expanded}<ChevronDown />{:else}<ChevronRight />{/if}
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

				<li>
					<ul
						class="sidebar-menu drag-zone"
						onconsider={handleDndConsiderOrganization}
						onfinalize={handleDndFinalizeOrganization}
						use:dragHandleZone={{
							dropTargetStyle: {},
							flipDurationMs: 100,
							items: favoriteItemsOrganization,
							type: 'organization'
						}}
					>
						{#each favoriteItemsOrganization as item, index (item.guid)}
							{@const href = page.url.searchParams.size
								? `${page.url.pathname}?${page.url.searchParams.toString()}`
								: page.url.pathname}
							<li animate:flip={{ duration: 100 }}>
								{#if $applicationState.containerDetailView.editable && $ability.can('update', page.data.currentOrganization)}
									<span
										class="drag-handle action-button action-button--padding-tight is-visible-on-hover"
										use:dragHandle
									>
										<DragHandle />
									</span>
								{/if}
								<a
									class="sidebar-menu-item sidebar-menu-item--secondary"
									class:sidebar-menu-item--active={item.href === href}
									href={item.href}
								>
									{#if item.icon}
										<img alt="" class="favorite-icon" src={transformFileURL(item.icon)} />
									{:else}
										<StarSolid />
									{/if}

									<span>{item.title}</span>
								</a>
								<EditableFavorite
									bind:favorite={favoriteList.organization[index]}
									onchange={updateFavorite(
										page.data.currentOrganization,
										favoriteList.organization
									)}
								/>
							</li>
						{/each}
					</ul>
				</li>
			</ul>
		</li>
	{/if}

	<li>
		<a
			{@attach tooltip($_('landing_page'))}
			class="sidebar-menu-item sidebar-menu-item--collapsed"
			class:sidebar-menu-item--active={landingPageURL(page.data.currentOrganization) ===
				page.url.toString()}
			href={landingPageURL(page.data.currentOrganization)}
		>
			<Home />
		</a>
	</li>
</ul>

{#if page.data.currentOrganizationalUnit}
	<ul
		class="sidebar-menu collapsible"
		class:collapsed={sidebarExpanded === false}
		class:expanded={sidebarExpanded === true}
		data-sveltekit-preload-data="hover"
	>
		<li>
			<button class="sidebar-menu-item sidebar-menu-item--toggle" use:organizationalUnitMenu.button>
				{#if $organizationalUnitMenu.expanded}<ChevronDown />{:else}<ChevronRight />{/if}
				<span>
					{page.data.currentOrganizationalUnit.payload.name}
				</span>
			</button>
		</li>

		{#if $organizationalUnitMenu.expanded}
			<li use:organizationalUnitMenu.panel>
				<ul class="sidebar-menu">
					<li>
						<a
							class="sidebar-menu-item sidebar-menu-item--secondary"
							class:sidebar-menu-item--active={landingPageURL(
								page.data.currentOrganizationalUnit
							) === page.url.toString()}
							href={landingPageURL(page.data.currentOrganizationalUnit)}
						>
							<OrganizationalUnit />
							<span>
								{$_('overview')}
							</span>
						</a>
					</li>

					<li>
						<ul
							class="sidebar-menu"
							onconsider={handleDndConsiderOrganizationalUnit}
							onfinalize={handleDndFinalizeOrganizationalUnit}
							use:dragHandleZone={{
								dropTargetStyle: {},
								flipDurationMs: 100,
								items: favoriteItemsOrganizationalUnit,
								type: 'organizationalUnit'
							}}
						>
							{#each favoriteItemsOrganizationalUnit as item, index (item.guid)}
								{@const href = page.url.searchParams.size
									? `${page.url.pathname}?${page.url.searchParams.toString()}`
									: page.url.pathname}
								<li>
									{#if $applicationState.containerDetailView.editable && $ability.can('update', page.data.currentOrganizationalUnit)}
										<span
											class="drag-handle action-button action-button--padding-tight is-visible-on-hover"
											use:dragHandle
										>
											<DragHandle />
										</span>
									{/if}
									<a
										class="sidebar-menu-item sidebar-menu-item--secondary"
										class:sidebar-menu-item--active={item.href === href}
										href={item.href}
									>
										{#if item.icon}
											<img alt="" class="favorite-icon" src={transformFileURL(item.icon)} />
										{:else}
											<StarSolid />
										{/if}

										<span>{item.title}</span>
									</a>
									<EditableFavorite
										bind:favorite={favoriteList.organizationalUnit[index]}
										onchange={updateFavorite(
											page.data.currentOrganizationalUnit,
											favoriteList.organizationalUnit
										)}
									/>
								</li>
							{/each}
						</ul>
					</li>
				</ul>
			</li>
		{/if}

		<li>
			<a
				{@attach tooltip($_('overview'))}
				class="sidebar-menu-item sidebar-menu-item--collapsed"
				class:sidebar-menu-item--active={landingPageURL(page.data.currentOrganizationalUnit) ===
					page.url.toString()}
				href={landingPageURL(page.data.currentOrganizationalUnit)}
			>
				<OrganizationalUnit />
			</a>
		</li>
	</ul>
{/if}

<ul
	class="sidebar-menu collapsible"
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
	class="sidebar-menu sidebar-menu--about collapsible"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
>
	<li>
		<button class="sidebar-menu-item sidebar-menu-item--toggle" use:platformMenu.button>
			{#if $platformMenu.expanded}<ChevronDown />{:else}<ChevronRight />{/if}
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
		class="sidebar-menu sidebar-menu--profile collapsible"
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

	.drag-handle {
		align-self: center;
		flex-shrink: 0;
	}

	.is-visible-on-hover {
		display: none;
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

	.sidebar-menu.collapsible.expanded > li:has(> .sidebar-menu-item--collapsed) {
		display: none;
	}

	.sidebar-menu.collapsible:not(.expanded) > li:not(:has(> .sidebar-menu-item--collapsed)) {
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

	.sidebar-menu.collapsible:not(.expanded) .sidebar-menu-item > span {
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

		.sidebar-menu.collapsible:not(.collapsed) {
			max-width: var(--sidebar-max-width);
		}

		.sidebar-menu.collapsible:not(.collapsed) .sidebar-menu {
			max-width: 100%;
		}

		.sidebar-menu.collapsible:not(.collapsed) .sidebar-menu-item > span {
			display: revert;
		}

		.sidebar-menu.collapsible:not(.collapsed) > li:not(:has(> .sidebar-menu-item--collapsed)) {
			display: flex;
		}

		.sidebar-menu.collapsible:not(.collapsed) > li:has(> .sidebar-menu-item--collapsed) {
			display: none;
		}

		.avatar:not(.collapsed) ~ :global(*) {
			display: revert;
		}
	}
</style>
