<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { getContext } from 'svelte';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Sort from '~icons/flowbite/sort-outline';
	import Close from '~icons/knotdots/close';
	import Filter from '~icons/knotdots/filter';
	import Users from '~icons/knotdots/users';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AssigneeFilterDropDown from '$lib/components/AssigneeFilterDropDown.svelte';
	import EditModeToggle from '$lib/components/EditModeToggle.svelte';
	import DotsBoardButton from '$lib/components/DotsBoardButton.svelte';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';
	import GoalWorkspaces from '$lib/components/GoalWorkspaces.svelte';
	import MeasureWorkspaces from '$lib/components/MeasureWorkspaces.svelte';
	import MemberFilterDropDown from '$lib/components/MemberFilterDropDown.svelte';
	import OrganizationIncludedFilterDropDown from '$lib/components/OrganizationIncludedFilterDropDown.svelte';
	import OrganizationMenu from '$lib/components/OrganizationMenu.svelte';
	import OverlayBackButton from '$lib/components/OverlayBackButton.svelte';
	import OverlayCloseButton from '$lib/components/OverlayCloseButton.svelte';
	import OverlayFullscreenToggle from '$lib/components/OverlayFullscreenToggle.svelte';
	import OverlayTitle from '$lib/components/OverlayTitle.svelte';
	import ProgramWorkspaces from '$lib/components/ProgramWorkspaces.svelte';
	import RelationTypeFilterDropDown from '$lib/components/RelationTypeFilterDropDown.svelte';
	import Search from '$lib/components/Search.svelte';
	import Workspaces from '$lib/components/Workspaces.svelte';
	import WorkspacesMenu from '$lib/components/WorkspacesMenu.svelte';
	import { popover } from '$lib/components/OrganizationMenu.svelte';
	import {
		isGoalContainer,
		isMeasureContainer,
		isProgramContainer,
		isSimpleMeasureContainer,
		overlayKey,
		overlayURL,
		paramsFromFragment
	} from '$lib/models';
	import { ability, user, overlay as overlayStore } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';
	import tooltip from '$lib/attachments/tooltip';
	import { createFeatureDecisions } from '$lib/features';

	interface Props {
		facets?: Map<string, Map<string, number>>;
		filterBarInitiallyOpen?: boolean;
		search?: boolean;
		sortOptions?: [string, string][];
		workspaceOptions?: { label: string; value: string }[];
	}

	let {
		facets = new Map(),
		filterBarInitiallyOpen = false,
		search = false,
		sortOptions = [
			[$_('sort_alphabetically'), 'alpha'],
			[$_('sort_modified'), 'modified']
		],
		workspaceOptions
	}: Props = $props();

	let overlay = getContext('overlay');

	let filterBar = createDisclosure({ label: $_('filters'), expanded: filterBarInitiallyOpen });

	let sortBar = createDisclosure({ label: $_('sort') });

	let selectedContext = $derived(
		page.data.currentOrganizationalUnit ?? page.data.currentOrganization
	);

	let selectedSort = $derived(page.url.searchParams.get('sort') ?? 'alpha');

	let activeFilters = $derived.by(() => {
		let count = 0;
		const params = overlay ? paramsFromFragment(page.url) : page.url.searchParams;

		for (const key of params.keys()) {
			if (facets.has(key)) {
				count = count + 1;
			}
		}

		return count;
	});

	function applySort() {
		if (overlay) {
			const query = new URLSearchParams(page.url.hash.substring(1));
			query.delete('sort');
			if (selectedSort != 'alpha') {
				query.append('sort', selectedSort);
			}
			goto(`#${query.toString()}`, { keepFocus: true });
		} else {
			const query = new URLSearchParams(page.url.searchParams);
			query.delete('sort');
			if (selectedSort != 'alpha') {
				query.append('sort', selectedSort);
			}
			goto(`?${query.toString()}${page.url.hash}`, { keepFocus: true });
		}
	}

	function resetFilters() {
		if (overlay) {
			const query = paramsFromFragment(page.url);
			for (const key of facets.keys()) {
				query.delete(key);
			}
			goto(`#${query.toString()}`, { keepFocus: true });
		} else {
			const query = new URLSearchParams(page.url.searchParams);
			for (const key of facets.keys()) {
				query.delete(key);
			}
			goto(`?${query.toString()}${page.url.hash}`, { keepFocus: true });
		}
	}
</script>

<!-- svelte-ignore a11y_no_redundant_roles -->
<header class:is-elevated={$popover.expanded} data-sveltekit-preload-data="hover" role="banner">
	{#if overlay}
		<OverlayCloseButton />
		<OverlayFullscreenToggle />
		<OverlayBackButton />
		<OverlayTitle />
	{:else}
		<OrganizationMenu />
		<DotsBoardButton />
	{/if}

	{#if workspaceOptions}
		<Workspaces options={workspaceOptions} />
	{:else if overlay && $overlayStore?.container}
		{#if isProgramContainer($overlayStore.container)}
			<ProgramWorkspaces container={$overlayStore.container} />
		{:else if isMeasureContainer($overlayStore.container) || isSimpleMeasureContainer($overlayStore.container)}
			<MeasureWorkspaces container={$overlayStore.container} />
		{:else if isGoalContainer($overlayStore.container) && createFeatureDecisions(page.data.features).useIOOI()}
			<GoalWorkspaces container={$overlayStore.container} />
		{/if}
	{:else}
		<WorkspacesMenu />
	{/if}

	<form class="commands" data-sveltekit-keepfocus>
		{#if search}
			<Search />
		{/if}

		{#if facets.size > 0}
			<button
				class="dropdown-button dropdown-button--command"
				onclick={() => sortBar.close()}
				type="button"
				{@attach tooltip($_('filter'))}
				use:filterBar.button
			>
				<Filter />
				<span class="is-visually-hidden is-visually-hidden--mobile-only">{$_('filter')}</span>
				{#if activeFilters > 0 && !$filterBar.expanded}
					<span class="indicator">{activeFilters}</span>
				{/if}
			</button>
		{/if}

		{#if sortOptions.length > 1 && (facets.size > 0 || search)}
			<button
				class="dropdown-button dropdown-button--command"
				onclick={() => filterBar.close()}
				type="button"
				{@attach tooltip($_('sort'))}
				use:sortBar.button
			>
				<Sort />
			</button>
		{/if}

		{#if overlay && $overlayStore?.container && $ability.can('invite-members', $overlayStore.container)}
			<div class="divider"></div>

			<a
				class="action-button action-button--size-l"
				href={overlayURL(page.url, overlayKey.enum.members, $overlayStore.container.guid)}
				{@attach tooltip($_('members'))}
			>
				<Users />
			</a>
		{:else if !overlay && !$overlayStore?.key && $ability.can('invite-members', selectedContext)}
			<div class="divider"></div>

			<a
				class="action-button action-button--size-l"
				href={resolve('/[[guid=uuid]]/members', { guid: selectedContext.guid })}
				{@attach tooltip($_('members'))}
			>
				<Users />
			</a>
		{/if}
	</form>

	{#if (!overlay && !$overlayStore?.key) || overlay}
		{#if $user.isAuthenticated}
			<EditModeToggle />
		{:else}
			<button class="button-primary button-xs" onclick={() => signIn('keycloak')} type="button">
				{$_('login')}
			</button>
		{/if}
	{/if}
</header>

<form class="filter-and-sort" data-sveltekit-keepfocus>
	{#if $filterBar.expanded}
		<fieldset use:filterBar.panel>
			{#if activeFilters > 0}
				<span>{$_('active_filters', { values: { count: activeFilters } })}</span>

				<button class="button-outline button-xs" onclick={resetFilters} type="button">
					<Close />
				</button>
			{/if}

			{#each facets.entries() as [key, foci] (key)}
				{@const options = [...foci.entries()]
					.map(([k, v]) => ({ count: v, label: $_(k), value: k }))
					.toSorted((a, b) =>
						a.label.localeCompare(b.label, undefined, {
							numeric: true,
							sensitivity: 'base'
						})
					)}
				{#if key === 'assignee'}
					<AssigneeFilterDropDown {options} />
				{:else if key === 'included'}
					<OrganizationIncludedFilterDropDown />
				{:else if key === 'relationType'}
					<RelationTypeFilterDropDown {options} />
				{:else if key === 'member'}
					<MemberFilterDropDown {options} />
				{:else if options.filter(({ count }) => count > 0).length > 0 || (overlay && paramsFromFragment(page.url).has(key)) || (!overlay && page.url.searchParams.has(key))}
					<FilterDropDown {key} {options} />
				{/if}
			{/each}
		</fieldset>
	{:else if $sortBar.expanded}
		<fieldset aria-labelledby="legend" use:sortBar.panel>
			<legend class="is-visually-hidden">{$_('sort')}</legend>
			<span aria-hidden="true">{$_('sort')}</span>
			{#each sortOptions as [label, value] (value)}
				{@const Icon = sortIcons.get(value)}
				<label class="sort-option">
					<input onchange={applySort} type="radio" {value} bind:group={selectedSort} />
					<Icon />
					{label}
				</label>
			{/each}
		</fieldset>
	{/if}
</form>

<style>
	header {
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-chevron-icon-size: 1rem;

		--icon-color: var(--color-gray-500);
		--indicator-background-color: var(--color-primary-700);

		align-items: center;
		background: white;
		border-bottom: 1px solid var(--color-gray-200);
		color: var(--color-gray-700);
		container-type: inline-size;
		display: flex;
		flex-shrink: 0;
		font-size: 0.875rem;
		gap: 0.5rem;
		height: var(--header-height);
		padding: 0.75rem;
		z-index: 2;
	}

	header :global(svg) {
		color: var(--icon-color);
	}

	.commands {
		align-items: center;
		display: flex;
		flex-direction: row;
		flex-shrink: 0;
		gap: 0.75rem;
		margin: 0 0.75rem 0 auto;
	}

	.commands:last-child {
		margin-right: 0;
	}

	.commands > * {
		width: fit-content;
	}

	.commands > .divider:first-child {
		display: none;
	}

	.divider {
		border-left: solid 1px var(--color-gray-200);
		height: 1.5rem;
	}

	.dropdown-button.dropdown-button--command {
		--dropdown-button-default-background: transparent;
		--dropdown-button-padding: 0 0.5rem 0 0.375rem;

		height: 2rem;
		position: relative;
	}

	.filter-and-sort fieldset {
		--indicator-background-color: var(--color-primary-700);

		align-items: center;
		background-color: var(--color-primary-050);
		border-radius: 0;
		border: none;
		display: flex;
		flex-direction: row;
		font-size: 0.875rem;
		gap: 0.25rem;
		justify-content: safe center;
		overflow: auto;
		padding: 0.5rem 1rem;
	}

	.filter-and-sort fieldset > :global(*) {
		flex-shrink: 0;
		justify-content: safe center;
	}

	.filter-and-sort legend + span[aria-hidden='true'] {
		color: var(--color-primary-700);
		padding: 0 0.75rem 0 0.5rem;
	}

	.filter-and-sort span:first-child {
		color: var(--color-primary-700);
		padding: 0 0.25rem 0 0.5rem;
	}

	.filter-and-sort button:first-of-type {
		margin-right: 0.75rem;
	}

	.indicator {
		position: absolute;
		right: -0.375rem;
		top: -0.375rem;
	}

	.is-elevated {
		z-index: 4;
	}

	.sort-option {
		border-radius: 8px;
		gap: 0;
		padding: 0.5rem 0.625rem;
	}

	.sort-option > input {
		appearance: none;
	}

	.sort-option > :global(svg) {
		height: 1rem;
		margin-right: 0.375rem;
		width: 1rem;
	}

	.sort-option:focus-within,
	.sort-option:hover {
		background-color: var(--color-primary-100);
	}

	.sort-option:has(> input:active) {
		background-color: var(--color-primary-300);
		color: var(--color-primary-700);
	}

	.sort-option:has(> input:checked) {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden.is-visually-hidden--mobile-only {
				all: revert-layer;
			}
		}
	}
</style>
