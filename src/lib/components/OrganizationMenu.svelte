<script lang="ts">
	import { slide } from 'svelte/transition';
	import { ChevronDown, ChevronUp, Home, Icon } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import logo1 from '$lib/assets/logo-1.svg';
	import logo2 from '$lib/assets/logo-2.svg';
	import logo3 from '$lib/assets/logo-3.svg';
	import AllOrganizationsCard from '$lib/components/AllOrganizationsCard.svelte';
	import {
		findAncestors,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import OrganizationMenuCard from '$lib/components/OrganizationMenuCard.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	$: showDropDown = $applicationState.organizationMenu.showDropDown;

	function toggleDropDown() {
		applicationState.update((state) => ({
			...state,
			organizationMenu: {
				...state.organizationMenu,
				showDropDown: !state.organizationMenu.showDropDown
			}
		}));
	}

	let organizations: OrganizationContainer[];
	let organizationalUnitsByLevel: OrganizationalUnitContainer[][];
	let currentContext: OrganizationContainer | OrganizationalUnitContainer =
		$page.data.currentOrganizationalUnit ?? $page.data.currentOrganization;
	let selectedContext: OrganizationContainer | OrganizationalUnitContainer | null = currentContext;
	let logo: string;
	let landingPageURL: string;

	$: {
		organizationalUnitsByLevel = [];

		if ('default' in currentContext.payload && currentContext.payload.default) {
			organizations = $page.data.organizations
				.filter((c: OrganizationContainer) => !c.payload.default)
				.filter((c: OrganizationContainer) =>
					selectedContext && selectedContext.guid != currentContext.guid
						? c.organization == selectedContext.organization
						: true
				);

			landingPageURL = '/about';

			const logos = [logo1, logo2, logo3];
			logo = logos[Math.floor($page.data.random * logos.length)];

			for (const level of [1, 2, 3, 4]) {
				organizationalUnitsByLevel = [
					...organizationalUnitsByLevel,
					$page.data.organizationalUnits
						.filter((c: OrganizationalUnitContainer) => c.payload.level === level)
						.filter((c: OrganizationalUnitContainer) =>
							selectedContext
								? selectedContext.guid != currentContext.guid
									? c.organization == selectedContext.organization
									: true
								: true
						)
				];
			}
		} else {
			organizations = $page.data.organizations
				.filter((c: OrganizationContainer) => !c.payload.default)
				.filter((c: OrganizationContainer) =>
					selectedContext ? c.organization == selectedContext.organization : true
				);

			landingPageURL = `/${currentContext.payload.type}/${currentContext.guid}`;

			if (currentContext.payload.image) {
				logo = currentContext.payload.image;
			} else if (isOrganizationalUnitContainer(currentContext)) {
				const firstAncestorWithImage = findAncestors<OrganizationalUnitContainer>(
					currentContext,
					$page.data.organizationalUnits
				).find(({ payload }) => payload.image);
				logo =
					firstAncestorWithImage?.payload.image ?? $page.data.currentOrganization.payload.image;
			}

			for (const level of [1, 2, 3, 4]) {
				organizationalUnitsByLevel = [
					...organizationalUnitsByLevel,
					$page.data.organizationalUnits
						.filter((c: OrganizationalUnitContainer) => c.payload.level === level)
						.filter((c: OrganizationalUnitContainer) =>
							selectedContext ? c.organization == selectedContext.organization : true
						)
				];
			}
		}
	}
</script>

<div class="organization-menu">
	<a href={landingPageURL}>
		{#if logo}
			<img alt={$_('logo')} class="logo" src={logo} />
		{:else}
			<Icon src={Home} size="20" />
		{/if}
		{#if isOrganizationContainer(currentContext) && currentContext.payload.default}
			{$_('all_organizations')}
		{:else}
			{currentContext.payload.name}
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
			<Board>
				<BoardColumn
					--background="transparent"
					--border="solid 1px var(--color-gray-900)"
					title={$_('organizations')}
				>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#if 'default' in currentContext.payload && currentContext.payload.default}
							{#each organizations as container}
								<OrganizationMenuCard
									--height="100%"
									{container}
									linkPath={$page.url.pathname
										.replace(/(\/about)|(\/imprint)|(\/privacy)/, `/organization/${container.guid}`)
										.replace('/organizational_unit/', '/organization/')
										.replace(currentContext.guid, container.guid)}
									bind:selectedContext
								/>
							{/each}
						{:else}
							{#each organizations as container}
								<OrganizationMenuCard
									--height="100%"
									{container}
									linkPath={$page.url.pathname
										.replace(/(\/about)|(\/imprint)|(\/privacy)/, `/organization/${container.guid}`)
										.replace('/organizational_unit/', '/organization/')
										.replace(currentContext.guid, container.guid)}
									bind:selectedContext
								/>
							{/each}
							<AllOrganizationsCard
								--height="100%"
								linkPath={$page.url.pathname.replace(/\/organization(al_unit)?\/.*/, '/about')}
							/>
						{/if}
					</div>
				</BoardColumn>
				{#each organizationalUnitsByLevel as containers, i}
					{@const level = i + 1}
					<BoardColumn
						--background="transparent"
						--border="solid 1px var(--color-gray-900)"
						title={$_('organizational_unit_level', { values: { level } })}
					>
						<div class="vertical-scroll-wrapper masked-overflow">
							{#each containers as container}
								<OrganizationMenuCard
									{container}
									linkPath={$page.url.pathname
										.replace(
											/(\/about)|(\/imprint)|(\/privacy)/,
											`/organizational_unit/${container.guid}`
										)
										.replace('/organization/', '/organizational_unit/')
										.replace(currentContext.guid, container.guid)}
									bind:selectedContext
								/>
							{/each}
						</div>
					</BoardColumn>
				{/each}
			</Board>
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
		height: calc(100vh - var(--nav-height));
		left: 0;
		position: absolute;
		right: 0;
		top: var(--nav-height);
	}
</style>
