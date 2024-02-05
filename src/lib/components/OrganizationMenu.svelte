<script lang="ts">
	import { slide } from 'svelte/transition';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Tabs from '$lib/components/Tabs.svelte';
	import TabItem from '$lib/components/TabItem.svelte';
	import { ChevronDown, ChevronUp, Home, Icon } from 'svelte-hero-icons';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import {
		findAncestors,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models.js';

	let showDropDown = false;

	function toggleDropDown() {
		showDropDown = !showDropDown;
	}

	let organizations: OrganizationContainer[] = [];
	let organizationalUnitsByLevel = new Map<number, OrganizationalUnitContainer[]>();
	let selectedContext: OrganizationContainer | OrganizationalUnitContainer;
	let logo: string;

	$: {
		organizations = $page.data.organizations;

		for (const level of [1, 2, 3, 4]) {
			organizationalUnitsByLevel.set(
				level,
				$page.data.organizationalUnits.filter(
					(c: OrganizationalUnitContainer) =>
						c.organization == $page.data.currentOrganization.guid && c.payload.level === level
				)
			);
		}

		selectedContext = $page.data.currentOrganizationalUnit ?? $page.data.currentOrganization;

		if (selectedContext.payload.image) {
			logo = selectedContext.payload.image;
		} else if (isOrganizationalUnitContainer(selectedContext)) {
			const firstAncestorWithImage = findAncestors<OrganizationalUnitContainer>(
				selectedContext,
				$page.data.organizationalUnits
			).find(({ payload }) => payload.image);
			logo = firstAncestorWithImage?.payload.image ?? $page.data.currentOrganization.payload.image;
		}
	}
</script>

<div class="organization-menu">
	<a href="/{selectedContext.payload.type}/{selectedContext.guid}">
		{#if logo}
			<img alt={$_('logo')} class="logo" src={logo} />
		{:else}
			<Icon src={Home} size="20" />
		{/if}
	</a>
	<button
		class="organization-menu-toggle"
		type="button"
		on:click={toggleDropDown}
		aria-controls="organization-menu-details"
		aria-expanded={showDropDown}
		aria-label={showDropDown ? $_('close_organization_menu') : $_('open_organization_menu')}
	>
		{#if isOrganizationContainer(selectedContext) && selectedContext.payload.default}
			<span>
				{$_('all_organizations')}
			</span>
		{:else}
			<span>
				{selectedContext.payload.name}
			</span>
		{/if}
		<Icon src={showDropDown ? ChevronUp : ChevronDown} size="20" mini />
	</button>

	{#if showDropDown}
		<div class="organization-menu-details" transition:slide={{ axis: 'y', duration: 400 }}>
			<Tabs>
				<TabItem title={$_('organizational_units')} open>
					<Board>
						{#each organizationalUnitsByLevel.entries() as [level, containers]}
							<BoardColumn title={$_('organizational_unit_level', { values: { level } })}>
								<div class="vertical-scroll-wrapper masked-overflow">
									{#each containers as container}
										<OrganizationCard
											{container}
											linkPath={$page.url.pathname
												.replace('/organization/', '/organizational_unit/')
												.replace(selectedContext.guid, container.guid)}
										/>
									{/each}
								</div>
							</BoardColumn>
						{/each}
					</Board>
				</TabItem>
				<TabItem title={$_('all_organizations')}>
					<ul class="board">
						{#each organizations.filter(({ payload }) => !payload.default) as container}
							<li>
								<OrganizationCard
									--height="100%"
									{container}
									linkPath={$page.url.pathname
										.replace('/organizational_unit/', '/organization/')
										.replace(selectedContext.guid, container.guid)}
								/>
							</li>
						{/each}
					</ul>
				</TabItem>
			</Tabs>
		</div>
	{/if}
</div>

<style>
	.organization-menu {
		align-items: center;
		display: flex;
	}

	.organization-menu > a {
		padding: 0 0.625rem;
		flex-shrink: 0;
	}

	.organization-menu-toggle {
		align-items: center;
		display: flex;
		flex-shrink: 0;
		gap: 0.5rem;
		padding-right: 0.5rem;
	}

	.organization-menu-toggle:active {
		background-color: inherit;
	}

	.organization-menu-toggle span {
		border-right: solid 1px var(--color-gray-200);
		padding-right: 0.75rem;
	}

	.organization-menu-details {
		background: white;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.05);
		left: 0;
		position: absolute;
		right: 0;
		top: var(--nav-height);
		z-index: 2;
	}

	ul {
		--margin-y: 0.75rem;

		display: flex;
		flex: 1 1;
		gap: var(--margin-y);
		margin: var(--margin-y) 0.375rem;
		overflow: auto;
	}

	li {
		width: 19.5rem;
	}
</style>
