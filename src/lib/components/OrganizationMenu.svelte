<script lang="ts">
	import { slide } from 'svelte/transition';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Tabs from '$lib/components/Tabs.svelte';
	import TabItem from '$lib/components/TabItem.svelte';
	import { ChevronDown, ChevronUp, Home, Icon } from 'svelte-hero-icons';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import {
		boards,
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
		{#if isOrganizationContainer(selectedContext) && selectedContext.payload.default}
			{$_('all_organizations')}
		{:else}
			{selectedContext.payload.name}
		{/if}
	</a>

	<button
		class="button-nav organization-menu-toggle"
		class:is-active={showDropDown}
		type="button"
		on:click={toggleDropDown}
		aria-controls="organization-menu-details"
		aria-expanded={showDropDown}
		aria-label={showDropDown ? $_('close_organization_menu') : $_('open_organization_menu')}
	>
		<span>{$_('organizations')}</span>
		<Icon src={showDropDown ? ChevronUp : ChevronDown} size="20" />
	</button>

	{#if showDropDown}
		<div class="organization-menu-details" transition:slide={{ axis: 'y', duration: 400 }}>
			<Tabs>
				{#if isOrganizationalUnitContainer(selectedContext) || selectedContext.payload.boards.includes(boards.enum['board.organizational_units'])}
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
				{/if}
				<TabItem
					title={$_('all_organizations')}
					open={!(
						isOrganizationalUnitContainer(selectedContext) ||
						selectedContext.payload.boards.includes(boards.enum['board.organizational_units'])
					)}
				>
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
		flex-shrink: 0;
	}

	.organization-menu > a {
		align-items: center;
		display: flex;
		padding: 0 0.625rem;
		flex-shrink: 0;
		gap: 0.5rem;
	}

	.organization-menu-toggle {
		align-items: center;
		display: flex;
		flex-shrink: 0;
		gap: 0.5rem;
		padding: 0 var(--padding-y) 0 0;
		overflow: hidden;
	}

	.organization-menu-toggle span {
		background: white;
		border-right: solid 1px var(--button-border-color);
		color: black;
		padding: var(--padding-y);
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
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--margin-y);
		margin: var(--margin-y) calc(var(--margin-y) / 2);
		overflow: auto;
	}

	li {
		width: 19.5rem;
	}
</style>
