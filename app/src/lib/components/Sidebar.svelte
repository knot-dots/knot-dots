<script lang="ts">
	import { getContext } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';
	import { type DndEvent, dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
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

	function landingPageURL(container: OrganizationContainer | OrganizationalUnitContainer) {
		return getOrganizationURL(container, '/all/page', env).toString();
	}

	const sidebar: { expanded: boolean; collapse: () => void; expand: () => void } =
		getContext('sidebar');

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

<header>
	<a href={landingPageURL(page.data.currentOrganization)}>
		<img
			class="logo"
			src={page.data.currentOrganization.payload.image
				? transformFileURL(page.data.currentOrganization.payload.image)
				: logo}
			alt={page.data.currentOrganization.payload.name}
		/>
	</a>

	<button class="action-button" onclick={() => sidebar.collapse()} type="button">
		<ChevronDoubleLeft />
		<span class="is-visually-hidden">{$_('collapse_sidebar')}</span>
	</button>
</header>

<div
	class={[
		'sidebar-panel',
		...(page.data.currentOrganizationalUnit ? [] : ['sidebar-panel--active'])
	]}
>
	<div class="sidebar-panel-header">
		<OrganizationMenu
			{defaultOrganization}
			options={organizations}
			selected={page.data.currentOrganization}
		/>
	</div>

	<div class="sidebar-panel-links">
		<button class="sidebar-panel-links-toggle" use:organizationLinks.button type="button">
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

{#if organizationalUnits.length > 0}
	<div
		class={[
			'sidebar-panel',
			...(page.data.currentOrganizationalUnit ? ['sidebar-panel--active'] : [])
		]}
	>
		<div class="sidebar-panel-header">
			<OrganizationalUnitMenu
				{defaultOrganization}
				{organizationalUnits}
				currentOrganizationalUnit={page.data.currentOrganizationalUnit}
			/>
		</div>

		{#if page.data.currentOrganizationalUnit}
			<div class="sidebar-panel-links">
				<button class="sidebar-panel-links-toggle" type="button" use:organizationalUnitLinks.button>
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

{#if $user.isAuthenticated}
	<div class="sidebar-panel sidebar-panel--user">
		<div class="sidebar-panel-header">
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

<div class="sidebar-panel sidebar-panel--footer">
	<a class="sidebar-menu-item sidebar-menu-item--footer" href={env.PUBLIC_BASE_URL} rel="external">
		<Favicon />
		<span class="truncated">knot dots</span>
		<ChevronRight />
	</a>
</div>

<style>
	header {
		align-items: center;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		padding: 0.25rem 0.25rem 0.25rem 0.5rem;
	}

	.sidebar-panel {
		background:
			linear-gradient(226deg, rgba(255, 255, 255, 0.75) 1%, rgba(255, 255, 255, 0) 98%),
			var(--color-gray-050);
		border: 1px solid var(--color-gray-100);
		border-radius: 12px;
		flex: 0 1 auto;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.sidebar-panel.sidebar-panel--active {
		background:
			linear-gradient(203deg, rgba(255, 255, 255, 0.75) 1%, rgba(255, 255, 255, 0) 98%),
			var(--color-primary-050);
		border-color: var(--color-primary-200);
	}

	.sidebar-panel.sidebar-panel--footer {
		margin-top: auto;
		flex: 0 0 auto;
	}

	.sidebar-panel-header {
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
		--dropdown-panel-max-height: 30rem;
	}

	.sidebar-panel-links-toggle {
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

	.sidebar-panel-links-toggle:hover {
		background-color: rgba(0, 0, 0, 0.04);
	}

	.sidebar-panel-links-toggle :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.sidebar-panel-links {
		display: flex;
		flex-direction: column;
	}

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
		min-width: 0;
	}

	.sidebar-menu-item {
		--color: var(--color-gray-600);
		--icon-color: var(--color-gray-400);

		align-items: center;
		border-radius: 8px;
		color: var(--color);
		display: flex;
		flex-direction: row;
		flex-grow: 1;
		font-size: 0.875rem;
		font-weight: 400;
		gap: 0.375rem;
		line-height: 1.5;
		min-width: 0;
		padding: 0.25rem 0.25rem 0.25rem 0.5rem;
		text-wrap: nowrap;
	}

	.sidebar-menu-item.sidebar-menu-item--footer {
		color: var(--color-gray-900);
		font-weight: 500;
	}

	.sidebar-menu-item.sidebar-menu-item--footer > :global(svg:last-child) {
		margin-left: auto;
	}

	.sidebar-menu-item.sidebar-menu-item--active {
		background-color: rgb(from var(--color-primary-500) r g b / 0.15);
		color: var(--color-gray-900);
	}

	.sidebar-menu-item:active {
		background-color: rgb(from var(--color-gray-500) r g b / 0.25);
	}

	.sidebar-menu-item:focus,
	.sidebar-menu-item:hover {
		background-color: rgb(from var(--color-gray-500) r g b / 0.1);
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
		border-radius: 8px;
		flex-shrink: 0;
	}

	@media (hover: hover) {
		li:hover > :global(.is-visible-on-hover) {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;

			display: block;
		}
	}
</style>
