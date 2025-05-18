<script module>
	import { createPopover } from 'svelte-headlessui';

	export const popover = createPopover({});
</script>

<script lang="ts">
	import { slide } from 'svelte/transition';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/heroicons/chevron-down-20-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-20-solid';
	import Home from '~icons/heroicons/home';
	import Organization from '~icons/knotdots/organization';
	import { page } from '$app/state';
	import logo1 from '$lib/assets/logo-1.svg';
	import logo2 from '$lib/assets/logo-2.svg';
	import logo3 from '$lib/assets/logo-3.svg';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import AllOrganizationsCard from '$lib/components/AllOrganizationsCard.svelte';
	import OrganizationMenuCard from '$lib/components/OrganizationMenuCard.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import {
		findAncestors,
		findDescendants,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		type OrganizationalUnitContainer,
		type OrganizationContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	$effect(() => {
		if (paramsFromURL(page.url).has('create')) {
			popover.close();
		}
	});

	popover.set({ label: $_('organizations_and_organizational_units') });

	const currentContext = $derived(
		page.data.currentOrganizationalUnit ?? page.data.currentOrganization
	);

	let selectedContext = $derived(currentContext);

	let organizations = $derived.by(() => {
		if ('default' in currentContext.payload && currentContext.payload.default) {
			return page.data.organizations
				.filter((c: OrganizationContainer) => !c.payload.default)
				.filter((c: OrganizationContainer) =>
					selectedContext && selectedContext.guid != currentContext.guid
						? c.organization == selectedContext.organization
						: true
				);
		} else {
			return page.data.organizations
				.filter((c: OrganizationContainer) => !c.payload.default)
				.filter((c: OrganizationContainer) =>
					selectedContext ? c.organization == selectedContext.organization : true
				);
		}
	});

	let organizationalUnitsByLevel = $derived.by(() => {
		let organizationalUnits = page.data.organizationalUnits.filter(
			(c: OrganizationalUnitContainer) =>
				selectedContext
					? 'default' in selectedContext.payload && selectedContext.payload.default
						? true
						: c.organization == selectedContext.organization
					: true
		);

		if (selectedContext && isOrganizationalUnitContainer(selectedContext)) {
			organizationalUnits = [
				selectedContext,
				...findAncestors(selectedContext, organizationalUnits, predicates.enum['is-part-of']),
				...findDescendants(selectedContext, organizationalUnits, predicates.enum['is-part-of'])
			];
		}

		let organizationalUnitsByLevel: OrganizationalUnitContainer[][] = [];

		for (const level of [1, 2, 3, 4]) {
			organizationalUnitsByLevel = [
				...organizationalUnitsByLevel,
				organizationalUnits.filter(({ payload }) => payload.level === level)
			];
		}

		return organizationalUnitsByLevel;
	});

	let logo = $derived.by(() => {
		const logos = [logo1, logo2, logo3];
		let logo = logos[Math.floor(page.data.random * logos.length)];

		if (currentContext.payload.image) {
			logo = currentContext.payload.image;
		} else if (isOrganizationalUnitContainer(currentContext)) {
			const firstAncestorWithImage = findAncestors<OrganizationalUnitContainer>(
				currentContext,
				page.data.organizationalUnits,
				predicates.enum['is-part-of']
			).find(({ payload }) => payload.image);
			if (firstAncestorWithImage?.payload.image) {
				logo = firstAncestorWithImage.payload.image;
			} else if (page.data.currentOrganization.payload.image) {
				logo = page.data.currentOrganization.payload.image;
			}
		}

		return logo;
	});

	let landingPageURL = $derived.by(() => {
		if ('default' in currentContext.payload && currentContext.payload.default) {
			return '/about';
		} else {
			return `/${currentContext.payload.type}/${currentContext.guid}`;
		}
	});
</script>

<div class="organization-menu">
	<a href={landingPageURL}>
		{#if logo}
			<img alt={$_('logo')} class="logo" src={logo} />
		{:else}
			<Home />
		{/if}
		<span>
			{#if isOrganizationContainer(currentContext) && currentContext.payload.default}
				{$_('all_organizations')}
			{:else}
				{currentContext.payload.name}
			{/if}
		</span>
	</a>

	<button class="button-nav organization-menu-toggle" type="button" use:popover.button>
		<span><Organization /></span>
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $popover.expanded}
		<div
			class="organization-menu-details"
			transition:slide={{ axis: 'y', duration: 400 }}
			use:popover.panel
		>
			<Board>
				<BoardColumn
					--background="transparent"
					--border="solid 1px var(--color-gray-900)"
					addItemUrl={$mayCreateContainer(
						payloadTypes.enum.organization,
						page.data.currentOrganization.guid
					)
						? `#create=${payloadTypes.enum.organization}`
						: undefined}
					title={$_('organizations')}
				>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#if 'default' in currentContext.payload && currentContext.payload.default}
							{#each organizations as container}
								<OrganizationMenuCard
									--height="100%"
									{container}
									linkPath={page.url.pathname
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
									linkPath={page.url.pathname
										.replace(/(\/about)|(\/imprint)|(\/privacy)/, `/organization/${container.guid}`)
										.replace('/organizational_unit/', '/organization/')
										.replace(currentContext.guid, container.guid)}
									bind:selectedContext
								/>
							{/each}
							<AllOrganizationsCard
								--height="100%"
								linkPath={page.url.pathname.replace(/\/organization(al_unit)?\/.*/, '/about')}
							/>
						{/if}
					</div>
				</BoardColumn>
				{#each organizationalUnitsByLevel as containers, i}
					{@const level = i + 1}
					<BoardColumn
						--background="transparent"
						--border="solid 1px var(--color-gray-900)"
						addItemUrl={!page.data.currentOrganization.payload.default &&
						page.data.currentOrganization.payload.boards.includes('board.organizational_units') &&
						$mayCreateContainer(
							payloadTypes.enum.organizational_unit,
							page.data.currentOrganization.guid
						)
							? `#create=${payloadTypes.enum.organizational_unit}&level=${level}`
							: undefined}
						title={$_('organizational_unit_level', { values: { level } })}
					>
						<div class="vertical-scroll-wrapper masked-overflow">
							{#each containers as container}
								<OrganizationMenuCard
									{container}
									linkPath={page.url.pathname
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
		gap: 1.5rem;
	}

	.organization-menu > a {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		max-width: var(--organization-menu-max-width);
	}

	.organization-menu > a > :global(svg) {
		flex-shrink: 0;
	}

	.organization-menu > a > span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
