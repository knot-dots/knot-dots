<script module>
	import { createPopover } from 'svelte-headlessui';

	export const popover = createPopover({});
</script>

<script lang="ts">
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { _ } from 'svelte-i18n';
	import ChevronSort from '~icons/flowbite/chevron-sort-outline';
	import Organization from '~icons/knotdots/organization';
	import { page } from '$app/state';
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
</script>

<div class="organization-menu">
	<button class="dropdown-button" type="button" use:popover.button>
		<Organization />
		<span class="is-visually-hidden truncated">
			{#if isOrganizationContainer(currentContext) && currentContext.payload.default}
				{$_('all_organizations')}
			{:else}
				{currentContext.payload.name}
			{/if}
		</span>
		<ChevronSort />
	</button>

	{#if $popover.expanded}
		<div
			class="organization-menu-panel"
			transition:slide={{ duration: 123, easing: cubicInOut }}
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
									linkPath={page.url.pathname}
									bind:selectedContext
								/>
							{/each}
						{:else}
							{#each organizations as container}
								<OrganizationMenuCard
									--height="100%"
									{container}
									linkPath={page.url.pathname}
									bind:selectedContext
								/>
							{/each}
							<AllOrganizationsCard --height="100%" linkPath={page.url.pathname} />
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
									linkPath={page.url.pathname}
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
	.dropdown-button {
		align-items: center;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-gray-900);
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
	}

	.dropdown-button:global([aria-expanded='true']) {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.dropdown-button :global(svg:first-child) {
		height: 1.5rem;
		width: 1.5rem;
	}

	.organization-menu {
		display: none;
		max-width: 20rem;
	}

	@container (min-width: 40rem) {
		.organization-menu {
			display: revert;
		}
	}

	.organization-menu-panel {
		background: white;
		height: calc(100vh - var(--header-height));
		left: 0;
		position: absolute;
		right: 0;
		top: var(--header-height);
	}

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden {
				all: revert-layer;
			}
		}
	}
</style>
