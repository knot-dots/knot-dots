<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { getContext } from 'svelte';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Sort from '~icons/flowbite/sort-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import Users from '~icons/flowbite/users-outline';
	import Filter from '~icons/knotdots/filter';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AssigneeFilterDropDown from '$lib/components/AssigneeFilterDropDown.svelte';
	import EditModeToggle from '$lib/components/EditModeToggle.svelte';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';
	import Search from '$lib/components/Search.svelte';
	import OrganizationIncludedFilterDropDown from '$lib/components/OrganizationIncludedFilterDropDown.svelte';
	import OrganizationMenu from '$lib/components/OrganizationMenu.svelte';
	import OverlayBackButton from '$lib/components/OverlayBackButton.svelte';
	import OverlayCloseButton from '$lib/components/OverlayCloseButton.svelte';
	import OverlayFullscreenToggle from '$lib/components/OverlayFullscreenToggle.svelte';
	import OverlayTitle from '$lib/components/OverlayTitle.svelte';
	import Workspaces from '$lib/components/Workspaces.svelte';
	import { popover } from '$lib/components/OrganizationMenu.svelte';
	import { paramsFromFragment } from '$lib/models';
	import { ability, user } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';

	interface Props {
		facets?: Map<string, Map<string, number>>;
		search?: boolean;
		sortOptions?: [string, string][];
		workspaceOptions?: { label: string; value: string }[];
	}

	let {
		facets = new Map(),
		search = false,
		sortOptions = [
			[$_('sort_alphabetically'), 'alpha'],
			[$_('sort_modified'), 'modified']
		],
		workspaceOptions
	}: Props = $props();

	let overlay = getContext('overlay');

	let filterBar = createDisclosure({ label: $_('filters') });

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

<header class:is-elevated={$popover.expanded} data-sveltekit-preload-data="hover" role="banner">
	{#if overlay}
		<OverlayCloseButton />
		<OverlayFullscreenToggle />
		<OverlayBackButton />
		<OverlayTitle />
	{:else}
		<OrganizationMenu />
	{/if}

	<Workspaces options={workspaceOptions} />

	<form class="commands" data-sveltekit-keepfocus>
		{#if search}
			<Search />
		{/if}

		{#if facets.size > 0}
			<button
				class="dropdown-button dropdown-button--command"
				onclick={() => sortBar.close()}
				type="button"
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
				use:sortBar.button
			>
				<Sort />
				<span class="is-visually-hidden">{$_('sort')}</span>
			</button>
		{/if}

		{#if $ability.can('invite-members', selectedContext)}
			<div class="divider"></div>

			<a href={`/${selectedContext.payload.type}/${selectedContext.guid}/members`}>
				<Users />
				<span class="is-visually-hidden">{$_('members')}</span>
			</a>
		{/if}
	</form>

	{#if $user.isAuthenticated}
		<EditModeToggle />
	{:else}
		<button class="button-primary button-xs" onclick={() => signIn('keycloak')} type="button">
			{$_('login')}
		</button>
	{/if}
</header>

<form class="filter-and-sort" data-sveltekit-keepfocus>
	{#if $filterBar.expanded}
		<fieldset use:filterBar.panel>
			{#if activeFilters > 0}
				<span>{$_('active_filters', { values: { count: activeFilters } })}</span>
			{/if}

			<button class="button-outline button-xs" onclick={resetFilters} type="button">
				<TrashBin />
			</button>

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
				{:else if options.filter(({ count }) => count > 0).length > 0}
					<FilterDropDown {key} {options} />
				{/if}
			{/each}
		</fieldset>
	{:else if $sortBar.expanded}
		<fieldset aria-labelledby="legend" use:sortBar.panel>
			<legend class="is-visually-hidden">{$_('sort')}</legend>
			<span aria-hidden="true">{$_('sort')}</span>
			{#each sortOptions as [label, value]}
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
		--icon-color: var(--color-gray-500);
		--indicator-background-color: var(--color-primary-700);

		align-items: center;
		background: white;
		border-bottom: 1px solid var(--color-gray-200);
		color: var(--color-gray-700);
		container-type: inline-size;
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		height: var(--nav-height);
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

	.commands > * {
		width: fit-content;
	}

	.divider {
		border-left: solid 1px var(--color-gray-200);
		height: 1.5rem;
	}

	.dropdown-button.dropdown-button--command {
		--button-background: transparent;

		align-items: center;
		border-radius: 8px;
		height: 2rem;
		padding: 0 0.5rem 0 0.375rem;
		position: relative;
	}

	.dropdown-button.dropdown-button--command:global([aria-expanded='true']) {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.dropdown-button.dropdown-button--command :global(svg) {
		height: 1rem;
		margin: 0.125rem;
		width: 1rem;
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
		height: 3rem;
		overflow: auto;
		padding: 0 0 0 1rem;
	}

	.filter-and-sort fieldset > :global(*) {
		flex-shrink: 0;
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

	@container (min-width: 768px) {
		.is-visually-hidden.is-visually-hidden--mobile-only {
			border: revert;
			clip: revert;
			height: revert;
			margin: revert;
			overflow: revert;
			padding: revert;
			position: revert;
			width: revert;
		}
	}
</style>
