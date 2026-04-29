<script lang="ts" module>
	let sidebarExpanded: boolean | undefined = $state(undefined);
</script>

<script lang="ts">
	import { signOut } from '@auth/sveltekit/client';
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
	import StarSolid from '~icons/flowbite/star-solid';
	import Cog from '~icons/knotdots/cog';
	import DragHandle from '~icons/knotdots/draghandle';
	import Favicon from '~icons/knotdots/favicon';
	import OrganizationalUnitIcon from '~icons/knotdots/organizational-unit';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import logo from '$lib/assets/logo.svg';
	import saveContainer from '$lib/client/saveContainer';
	import EditableFavorite from '$lib/components/EditableFavorite.svelte';
	import ProfileSettingsDialog from '$lib/components/ProfileSettingsDialog.svelte';
	import SidebarContextSelect from '$lib/components/SidebarContextSelect.svelte';
	import SidebarOrgUnitSelect from '$lib/components/SidebarOrgUnitSelect.svelte';
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

	let orgMainPagesExpanded = $state(true);
	let orgUnitMainPagesExpanded = $state(true);
	let userFavoritesExpanded = $state(true);

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

	<button class="action-button" onclick={collapseSidebar} type="button">
		<ChevronDoubleLeft />
		<span class="is-visually-hidden">{$_('collapse_sidebar')}</span>
	</button>

	<button class="action-button" onclick={expandSidebar} type="button">
		<Bars />
		<span class="is-visually-hidden">{$_('expand_sidebar')}</span>
	</button>
</header>

<div
	class="scroll-wrapper"
	class:collapsed={sidebarExpanded === false}
	class:expanded={sidebarExpanded === true}
	data-sveltekit-preload-data="hover"
>
	<!-- Organization (Mandant) Panel -->
	<div class="panel-section panel-section--active">
		<div class="panel-header">
			<SidebarContextSelect
				{defaultOrganization}
				options={organizations}
				title={$_('organizations')}
			>
				<img
					alt=""
					class="panel-select-icon"
					src={page.data.currentOrganization.payload.image
						? transformFileURL(page.data.currentOrganization.payload.image)
						: logo}
				/>
				<span class="panel-select-label truncated">
					{page.data.currentOrganization.payload.name}
				</span>
			</SidebarContextSelect>
		</div>

		<!-- Hauptseiten toggle + favorites -->
		<div class="panel-links">
			<button
				class="toggle-label"
				onclick={() => (orgMainPagesExpanded = !orgMainPagesExpanded)}
				type="button"
			>
				{#if orgMainPagesExpanded}<ChevronDown />{:else}<ChevronRight />{/if}
				<span>{$_('main_pages')}</span>
			</button>

			{#if orgMainPagesExpanded}
				<ul class="sidebar-menu" transition:slide={{ duration: 125, easing: cubicInOut }}>
					<li>
						<a
							class="sidebar-menu-item"
							class:sidebar-menu-item--active={landingPageURL(page.data.currentOrganization) ===
								page.url.toString()}
							href={landingPageURL(page.data.currentOrganization)}
						>
							<OrganizationalUnitIcon />
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
		<div class="panel-section panel-section--active">
			<div class="panel-header">
				<SidebarOrgUnitSelect
					{defaultOrganization}
					{organizationalUnits}
					currentOrganizationalUnit={page.data.currentOrganizationalUnit}
					title={$_('organizational_units')}
				>
					<OrganizationalUnitIcon />
					<span class="panel-select-label truncated">
						{page.data.currentOrganizationalUnit?.payload.name ?? $_('organizational_units')}
					</span>
				</SidebarOrgUnitSelect>
			</div>

			{#if page.data.currentOrganizationalUnit}
				<!-- Hauptseiten toggle + favorites -->
				<div class="panel-links">
					<button
						class="toggle-label"
						onclick={() => (orgUnitMainPagesExpanded = !orgUnitMainPagesExpanded)}
						type="button"
					>
						{#if orgUnitMainPagesExpanded}<ChevronDown />{:else}<ChevronRight />{/if}
						<span>{$_('main_pages')}</span>
					</button>

					{#if orgUnitMainPagesExpanded}
						<ul class="sidebar-menu" transition:slide={{ duration: 125, easing: cubicInOut }}>
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
				<button class="panel-select-button" type="button" use:userMenu.button>
					<span class="avatar avatar-s">
						{$user.givenName.at(0)}{$user.familyName.at(0)}
					</span>
					<span class="panel-select-label truncated">
						{$user.givenName}
						{$user.familyName}
					</span>
					<ChevronDown />
				</button>
			</div>

			{#if $userMenu.expanded}
				<div
					class="panel-links"
					transition:slide={{ duration: 125, easing: cubicInOut }}
					use:userMenu.panel
				>
					<button
						class="toggle-label"
						onclick={() => (userFavoritesExpanded = !userFavoritesExpanded)}
						type="button"
					>
						{#if userFavoritesExpanded}<ChevronDown />{:else}<ChevronRight />{/if}
						<span>{$_('favorites')}</span>
					</button>

					{#if userFavoritesExpanded}
						<ul class="sidebar-menu" transition:slide={{ duration: 125, easing: cubicInOut }}>
							<li>
								<a
									class="sidebar-menu-item"
									class:sidebar-menu-item--active={'/me' === page.url.pathname}
									href="/me"
								>
									<Favicon />
									<span>{$_('workspace.profile')}</span>
								</a>
							</li>
							<li>
								<button class="sidebar-menu-item" onclick={() => dialog.showModal()} type="button">
									<Cog />
									<span>{$_('profile.settings')}</span>
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
				</div>
			{/if}
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
		flex: 1 0 0;
		min-height: 0;
	}

	/* Panel Header (select button) */
	.panel-header {
		display: flex;
		align-items: center;
	}

	.panel-select-button {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-gray-900);
		cursor: pointer;
		display: flex;
		flex: 1 0 0;
		gap: 0.375rem;
		height: 2.25rem;
		min-width: 0;
		padding: 0 0.5rem;
	}

	.panel-section--active :global(.context-select-button) {
		color: var(--color-gray-900);
	}

	.panel-select-button:hover {
		background-color: rgba(0, 0, 0, 0.04);
	}

	.panel-select-button :global(svg) {
		color: inherit;
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.panel-select-icon {
		border-radius: 2px;
		height: 1rem;
		object-fit: contain;
		width: 1rem;
	}

	.panel-select-label {
		flex: 1 0 0;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.25;
		min-width: 0;
		overflow: hidden;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Toggle label (Hauptseiten / Favoriten) */
	.toggle-label {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-gray-400);
		cursor: pointer;
		display: flex;
		font-size: 0.75rem;
		font-weight: 600;
		gap: 0.25rem;
		height: 2rem;
		padding: 0.25rem 0.5rem;
		position: sticky;
		top: 0;
		width: 100%;
	}

	.toggle-label:hover {
		background-color: rgba(0, 0, 0, 0.04);
	}

	.toggle-label :global(svg) {
		color: inherit;
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
		gap: 0.375rem;
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
		max-width: 100%;
		min-width: 0;
		padding: 0.375rem 0.5rem;
		text-wrap: nowrap;
	}

	.sidebar-menu-item--active {
		background-color: var(--color-gray-100);
	}

	.sidebar-menu-item--logout {
		--color: var(--color-red-600);
		--icon-color: var(--color-red-600);
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

	.is-visible-on-hover {
		display: none;
	}

	.avatar {
		align-items: center;
		background-color: var(--color-gray-100);
		border: 1px solid var(--color-gray-200);
		border-radius: 50px;
		box-sizing: border-box;
		display: flex;
		flex-shrink: 0;
		font-size: 0.625rem;
		font-weight: 500;
		height: 1.5rem;
		justify-content: center;
		text-align: center;
		width: 1.5rem;
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
