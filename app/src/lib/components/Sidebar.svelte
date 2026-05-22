<script lang="ts" module>
	let sidebarExpanded: boolean | undefined = $state(undefined);
</script>

<script lang="ts">
	import { getContext } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';
	import { type DndEvent, dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Bars from '~icons/flowbite/bars-outline';
	import ChevronDoubleLeft from '~icons/flowbite/chevron-double-left-outline';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import Grid from '~icons/flowbite/grid-solid';
	import Home from '~icons/flowbite/home-solid';
	import StarSolid from '~icons/flowbite/star-solid';
	import DragHandle from '~icons/knotdots/draghandle';
	import Favicon from '~icons/knotdots/favicon';
	import OrganizationalUnitIcon from '~icons/knotdots/organizational-unit';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo.svg';
	import tooltip from '$lib/attachments/tooltip';
	import saveContainer from '$lib/client/saveContainer';
	import EditableFavorite from '$lib/components/EditableFavorite.svelte';
	import OrganizationMenu from '$lib/components/OrganizationMenu.svelte';
	import OrganizationalUnitMenu from '$lib/components/OrganizationalUnitMenu.svelte';
	import UserMenu from '$lib/components/UserMenu.svelte';
	import { type Favorite, getFavoriteListContext } from '$lib/contexts/favoriteList';
	import {
		getOrganizationURL,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import { ability, applicationState, user } from '$lib/stores';
	import transformFileURL from '$lib/transformFileURL';

	let favoriteList = getFavoriteListContext();

	let organizationLinks = createDisclosure({ expanded: true, label: $_('main pages') });

	let organizationalUnitLinks = createDisclosure({ expanded: true, label: $_('main pages') });

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

	let defaultOrganization = $derived(
		page.data.organizations.find((c: OrganizationContainer) => c.payload.default)
	);

	let organizations = $derived(
		page.data.organizations.filter(
			(c: OrganizationContainer) =>
				!c.payload.default && c.guid !== page.data.currentOrganization.guid
		)
	);

	let organizationalUnits = $derived(
		page.data.organizationalUnits.filter(
			(c: OrganizationalUnitContainer) =>
				c.organization === page.data.currentOrganization.organization
		)
	);

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

<div
	class="collapsed-menu"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
>
	<div class="collapsed-menu-top">
		<div class="collapsed-panel">
			<a
				{@attach tooltip(page.data.currentOrganization.payload.name)}
				class="collapsed-panel-item"
				href={landingPageURL(page.data.currentOrganization)}
			>
				<Home />
			</a>
		</div>
		{#if organizationalUnits.length > 0}
			<div
				class="collapsed-panel"
				class:collapsed-panel--active={!!page.data.currentOrganizationalUnit}
			>
				<a
					{@attach tooltip(
						page.data.currentOrganizationalUnit?.payload.name ?? $_('organizational_units')
					)}
					class="collapsed-panel-item"
					href={page.data.currentOrganizationalUnit
						? landingPageURL(page.data.currentOrganizationalUnit)
						: landingPageURL(page.data.currentOrganization)}
				>
					<OrganizationalUnitIcon />
				</a>
			</div>
		{/if}
		{#if $user.isAuthenticated}
			<div class="collapsed-panel">
				<a {@attach tooltip($_('workspace.profile'))} class="collapsed-panel-item" href="/me">
					<Grid />
				</a>
			</div>
		{/if}
	</div>
	<div class="collapsed-menu-bottom">
		{#if $user.isAuthenticated}
			<div class="collapsed-panel">
				<button
					{@attach tooltip(`${$user.givenName} ${$user.familyName}`)}
					class="collapsed-panel-item"
					onclick={() => expandSidebar()}
					type="button"
				>
					<span class="avatar avatar-s">
						{$user.givenName.at(0)}{$user.familyName.at(0)}
					</span>
				</button>
			</div>
		{/if}
		<div class="collapsed-panel">
			<a
				{@attach tooltip('knot dots')}
				class="collapsed-panel-item"
				href={env.PUBLIC_BASE_URL}
				rel="external"
			>
				<Favicon />
			</a>
		</div>
	</div>
</div>

<div
	class="scroll-wrapper"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
	data-sveltekit-preload-data="hover"
>
	<!-- Organization (Mandant) Panel -->
	<div class="panel-section" class:panel-section--active={!page.data.currentOrganizationalUnit}>
		<div class="panel-header">
			<OrganizationMenu
				{defaultOrganization}
				options={organizations}
				selected={page.data.currentOrganization}
			/>
		</div>

		<!-- Hauptseiten toggle + favorites -->
		<div class="panel-links">
			<button class="panel-links-toggle" use:organizationLinks.button type="button">
				{#if $organizationLinks.expanded}
					<ChevronDown />
					<span>{$_('hide_links')}</span>
				{:else}
					<ChevronRight />
					<span>{$_('show_links')}</span>
				{/if}
			</button>

			{#if $organizationLinks.expanded}
				<ul
					class="sidebar-menu"
					transition:slide={{ duration: 125, easing: cubicInOut }}
					use:organizationLinks.panel
				>
					<li>
						<a
							class="sidebar-menu-item"
							class:sidebar-menu-item--active={landingPageURL(page.data.currentOrganization) ===
								page.url.toString()}
							href={landingPageURL(page.data.currentOrganization)}
						>
							<Home />
							<span>{$_('landing_page')}</span>
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
										class="sidebar-menu-item"
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
			{/if}
		</div>
	</div>

	<!-- Organizational Unit Panel -->
	{#if organizationalUnits.length > 0}
		<div class="panel-section" class:panel-section--active={!!page.data.currentOrganizationalUnit}>
			<div class="panel-header">
				<OrganizationalUnitMenu
					{defaultOrganization}
					{organizationalUnits}
					currentOrganizationalUnit={page.data.currentOrganizationalUnit}
				/>
			</div>

			{#if page.data.currentOrganizationalUnit}
				<!-- Hauptseiten toggle + favorites -->
				<div class="panel-links">
					<button class="panel-links-toggle" type="button" use:organizationalUnitLinks.button>
						{#if $organizationalUnitLinks.expanded}
							<ChevronDown />
							<span>{$_('hide_links')}</span>
						{:else}
							<ChevronRight />
							<span>{$_('show_links')}</span>
						{/if}
					</button>

					{#if $organizationalUnitLinks.expanded}
						<ul
							class="sidebar-menu"
							transition:slide={{ duration: 125, easing: cubicInOut }}
							use:organizationalUnitLinks.panel
						>
							<li>
								<a
									class="sidebar-menu-item"
									class:sidebar-menu-item--active={landingPageURL(
										page.data.currentOrganizationalUnit
									) === page.url.toString()}
									href={landingPageURL(page.data.currentOrganizationalUnit)}
								>
									<OrganizationalUnitIcon />
									<span>{$_('overview')}</span>
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
												class="sidebar-menu-item"
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
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- User Panel -->
	{#if $user.isAuthenticated}
		<div class="panel-section panel-section--user">
			<div class="panel-header">
				<UserMenu />
			</div>

			<ul class="sidebar-menu" transition:slide={{ duration: 125, easing: cubicInOut }}>
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
			</ul>
		</div>
	{/if}
</div>

<!-- Platform footer -->
<div
	class="platform-footer"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
>
	<a class="platform-footer-link" href={env.PUBLIC_BASE_URL} rel="external">
		<Favicon />
		<span class="truncated">knot dots</span>
		<ChevronRight />
	</a>
</div>

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

	header.collapsed {
		border-bottom: none;
		height: auto;
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

	/* Collapsed menu (icon-only, visible when sidebar is collapsed) */
	.collapsed-menu {
		display: flex;
		flex-direction: column;
		flex: 1 0 0;
		gap: 0.25rem;
		justify-content: space-between;
		min-height: 0;
		padding: 0.25rem;
	}

	.collapsed-menu.expanded {
		display: none;
	}

	.collapsed-menu-top,
	.collapsed-menu-bottom {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.collapsed-panel {
		background:
			linear-gradient(205deg, rgba(255, 255, 255, 0.75) 1%, rgba(255, 255, 255, 0) 98%),
			var(--color-gray-050);
		border: none;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
	}

	.collapsed-panel--active {
		background:
			linear-gradient(205deg, rgba(255, 255, 255, 0.75) 1%, rgba(255, 255, 255, 0) 98%),
			var(--color-primary-050);
	}

	.collapsed-panel-item {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-gray-600);
		cursor: pointer;
		display: flex;
		height: 2rem;
		justify-content: center;
		padding: 0.5rem;
		width: 2rem;
	}

	.collapsed-panel-item:hover {
		background-color: rgba(0, 0, 0, 0.04);
	}

	.collapsed-panel-item :global(svg) {
		color: var(--color-gray-400);
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.scroll-wrapper {
		display: flex;
		flex: 1 0 0;
		flex-direction: column;
		gap: 0.25rem;
		min-height: 0;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.scroll-wrapper:not(.expanded) {
		display: none;
	}

	/* Panel Section */
	.panel-section {
		background:
			linear-gradient(226deg, rgba(255, 255, 255, 0.75) 1%, rgba(255, 255, 255, 0) 98%),
			var(--color-gray-050);
		border: 1px solid var(--color-gray-100);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		padding: 0.25rem;
	}

	.panel-section--active {
		background:
			linear-gradient(203deg, rgba(255, 255, 255, 0.75) 1%, rgba(255, 255, 255, 0) 98%),
			var(--color-primary-050);
		border-color: var(--color-primary-200);
	}

	.panel-section--user {
		flex: 0 0 auto;
	}

	/* Panel Header (select button) */
	.panel-header {
		--dropdown-button-border-radius: 8px;
		--dropdown-button-chevron-icon-size: 1rem;
		--dropdown-button-chevron-default-color: var(--color-gray-400);
		--dropdown-button-default-background: transparent;
		--dropdown-button-default-color: var(--color-gray-900);
		--dropdown-button-expanded-background: rgb(from var(--color-primary-500) r g b / 0.15);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-min-height: 2rem;
		--dropdown-panel-background-color: var(--color-gray-025);
		--dropdown-panel-box-shadow: var(--shadow-lg);
		--dropdown-panel-gap: 0;
		--dropdown-panel-padding: 0;
	}

	/* Toggle label (Hauptseiten / Favoriten) */
	.panel-links-toggle {
		align-items: center;
		border: none;
		color: var(--color-gray-500);
		display: flex;
		font-size: 0.75rem;
		font-weight: 600;
		gap: 0.375rem;
		height: 2rem;
		padding: 0 0.5rem;
		width: 100%;
	}

	.panel-links-toggle:hover {
		background-color: rgba(0, 0, 0, 0.04);
	}

	.panel-links-toggle :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	/* Panel links wrapper */
	.panel-links {
		display: flex;
		flex-direction: column;
	}

	/* Sidebar menu items (reused for favorites) */
	.sidebar-menu {
		display: flex;
		flex-direction: column;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.sidebar-menu > li {
		align-items: center;
		display: flex;
		gap: 0.375rem;
		min-width: 0;
	}

	.sidebar-menu-item {
		--color: var(--color-gray-600);
		--icon-color: var(--color-gray-400);

		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color);
		cursor: pointer;
		display: flex;
		flex-direction: row;
		flex-grow: 1;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.375rem;
		line-height: 1.5;
		min-width: 0;
		padding: 0.375rem 0.5rem;
		text-wrap: nowrap;
	}

	.sidebar-menu-item--active {
		background-color: var(--color-gray-100);
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
		min-width: 0;
		padding: 0;
	}

	.sidebar-menu-item > span {
		overflow: hidden;
		text-align: left;
		text-overflow: ellipsis;
	}

	.sidebar-menu-item :global(svg) {
		color: var(--icon-color);
		flex-shrink: 0;
		height: 1rem;
		max-width: none;
		width: 1rem;
	}

	.favorite-icon {
		height: 1rem;
		width: 1rem;
	}

	.drag-handle {
		align-self: center;
		flex-shrink: 0;
	}

	/* Platform footer */
	.platform-footer {
		background-color: var(--color-gray-050);
		border: 1px solid var(--color-gray-100);
		border-radius: 12px;
		margin: 0 0.25rem 0.25rem;
		padding: 0.25rem;
	}

	.platform-footer:not(.expanded) {
		display: none;
	}

	.platform-footer-link {
		align-items: center;
		border-radius: 8px;
		color: var(--color-gray-900);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.375rem;
		height: 2rem;
		padding: 0.25rem 0.5rem;
	}

	.platform-footer-link:hover {
		background-color: rgba(0, 0, 0, 0.04);
	}

	.platform-footer-link :global(svg) {
		color: var(--color-gray-400);
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.platform-footer-link :global(svg:last-child) {
		margin-left: auto;
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

		.collapsed-menu:not(.collapsed) {
			display: none;
		}

		.collapsed-menu.collapsed {
			max-width: 3rem;
		}

		.scroll-wrapper:not(.collapsed) {
			display: flex;
			max-width: var(--sidebar-max-width);
		}

		.platform-footer:not(.collapsed) {
			display: block;
			max-width: var(--sidebar-max-width);
		}
	}
</style>
