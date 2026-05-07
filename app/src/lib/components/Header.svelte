<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { getContext, untrack } from 'svelte';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Sort from '~icons/flowbite/sort-outline';
	import StarOutline from '~icons/flowbite/star-outline';
	import StarSolid from '~icons/flowbite/star-solid';
	import Bars from '~icons/flowbite/bars-outline';
	import Close from '~icons/knotdots/close';
	import Compare from '~icons/knotdots/compare';
	import Filter from '~icons/knotdots/filter';
	import Users from '~icons/knotdots/users';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import saveContainer from '$lib/client/saveContainer';
	import AssigneeFilterDropDown from '$lib/components/AssigneeFilterDropDown.svelte';
	import BackToOverlayButton from '$lib/components/BackToOverlayButton.svelte';
	import CompareBar from '$lib/components/CompareBar.svelte';
	import DotsBoardButton from '$lib/components/DotsBoardButton.svelte';
	import EditModeToggle from '$lib/components/EditModeToggle.svelte';
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
	import OverlaySettingsDropdown from '$lib/components/OverlaySettingsDropdown.svelte';
	import RelationTypeFilterDropDown from '$lib/components/RelationTypeFilterDropDown.svelte';
	import Search from '$lib/components/Search.svelte';
	import ViewSelect from '$lib/components/ViewSelect.svelte';
	import Workspaces from '$lib/components/Workspaces.svelte';
	import WorkspacesMegaMenu from '$lib/components/WorkspacesMegaMenu.svelte';
	import { popover } from '$lib/components/OrganizationMenu.svelte';
	import { getFavoriteListContext } from '$lib/contexts/favoriteList';
	import { createFeatureDecisions } from '$lib/features';
	import {
		isGoalContainer,
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isPageContainer,
		isProgramContainer,
		isReportContainer,
		isSimpleMeasureContainer,
		overlayKey,
		overlayURL,
		paramsFromFragment
	} from '$lib/models';
	import { ability, user, overlay as overlayStore, compareState } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';

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

	let mobileMenu: { open: boolean; toggle: () => void; close: () => void } =
		getContext('mobileMenu');

	let container = $derived(overlay ? $overlayStore?.container : page.data.container);

	let filterBar = $derived(
		createDisclosure({ label: $_('filters'), expanded: filterBarInitiallyOpen })
	);

	let sortBar = createDisclosure({ label: $_('sort') });

	let compareBar = $derived(
		createDisclosure({
			label: $_('compare_data'),
			expanded:
				untrack(() => $compareState.selectedMunicipalities.length > 0) &&
				(isReportContainer(container) || isIndicatorTemplateContainer(container))
		})
	);

	let selectedContext = $derived(
		page.data.currentOrganizationalUnit ?? page.data.currentOrganization
	);

	let isOnPage = $derived.by(() => {
		const segments = page.url.pathname.split('/');
		const pathWithoutContext =
			segments.length > 1 && segments[1] === selectedContext?.guid
				? '/' + segments.slice(2).join('/')
				: page.url.pathname;
		return (
			pathWithoutContext === '/all/page' || pathWithoutContext === '/' || pathWithoutContext === ''
		);
	});

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

	let favoritesList = getFavoriteListContext();

	let href = $derived(
		page.url.searchParams.size
			? `${page.url.pathname}?${page.url.searchParams.toString()}`
			: page.url.pathname
	);

	let isFavorite = $derived(
		[...favoritesList.organization, ...favoritesList.organizationalUnit].findIndex(
			(f) => f.href === href
		) > -1
	);

	let facetLabels = $derived(page.data.categoryContext.labels);

	let categoryOptions = $derived(page.data.categoryContext.options);

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

	async function toggleFavorite() {
		const key = page.data.currentOrganizationalUnit ? 'organizationalUnit' : 'organization';
		const index = favoritesList[key].findIndex((f) => f.href === href);

		favoritesList[key] =
			index > -1
				? favoritesList[key].filter((_, i) => i !== index)
				: [...favoritesList[key], { href, title: page.data.title ?? $_('new_favorite') }];

		const response = await saveContainer({
			...selectedContext,
			payload: { ...selectedContext.payload, favorite: favoritesList[key] }
		});
		if (response.ok) {
			const updatedContainer = await response.json();
			selectedContext.revision = updatedContainer.revision;
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}
</script>

<!-- svelte-ignore a11y_no_redundant_roles -->
<header class:is-elevated={$popover.expanded} data-sveltekit-preload-data="hover" role="banner">
	{#if mobileMenu}
		<button
			class="mobile-menu-button"
			type="button"
			onclick={() => mobileMenu.toggle()}
			aria-label={$_('menu')}
		>
			<Bars />
		</button>
	{/if}

	{#if overlay}
		<OverlayCloseButton />
		<OverlayFullscreenToggle />
		<OverlayBackButton />
		<OverlayTitle />
	{:else}
		<OrganizationMenu />
		<DotsBoardButton />
		<BackToOverlayButton />
	{/if}

	{#if workspaceOptions}
		<Workspaces options={workspaceOptions} />
	{:else if container}
		{#if isProgramContainer(container)}
			<ProgramWorkspaces {container} />
		{:else if isMeasureContainer(container) || isSimpleMeasureContainer(container)}
			<MeasureWorkspaces {container} />
		{:else if isGoalContainer(container) && createFeatureDecisions(page.data.features).useIOOI()}
			<GoalWorkspaces {container} />
		{:else if isOrganizationContainer(container) || isOrganizationalUnitContainer(container) || isPageContainer(container)}
			<WorkspacesMegaMenu />
		{/if}
	{:else}
		<WorkspacesMegaMenu />
	{/if}

	<div class="actions">
		{#if overlay && container && $ability.can('invite-members', container)}
			<div class="divider"></div>

			<a
				class="action-button action-button--size-l"
				href={overlayURL(page.url, overlayKey.enum.members, container.guid)}
				{@attach tooltip($_('members'))}
			>
				<Users />
			</a>
		{:else if !overlay && !$overlayStore?.key && container && (isProgramContainer(container) || isMeasureContainer(container) || isSimpleMeasureContainer(container)) && $ability.can('invite-members', container)}
			<div class="divider"></div>

			<a
				class="action-button action-button--size-l"
				href={resolve('/[guid=uuid]/[contentGuid=uuid]/all/members', {
					guid: selectedContext.guid,
					contentGuid: container.guid
				})}
				{@attach tooltip($_('members'))}
			>
				<Users />
			</a>
		{:else if !overlay && !$overlayStore?.key && $ability.can('invite-members', selectedContext)}
			<a
				class="action-button action-button--size-l"
				href={resolve('/[guid=uuid]/members', { guid: selectedContext.guid })}
				{@attach tooltip($_('members'))}
			>
				<Users />
			</a>
		{/if}

		{#if !overlay && page.data.title && $ability.can('update', selectedContext)}
			<button
				aria-label={$_('favorite')}
				class="action-button action-button--size-l action-button--favorite"
				onclick={toggleFavorite}
				type="button"
			>
				{#if isFavorite}<StarSolid />{:else}<StarOutline />{/if}
			</button>
		{/if}

		{#if (!overlay && !$overlayStore?.key) || overlay}
			{#if $user.isAuthenticated}
				<EditModeToggle />
			{:else}
				<button class="button-primary button-xs" onclick={() => signIn('keycloak')} type="button">
					{$_('login')}
				</button>
			{/if}
		{/if}

		{#if createFeatureDecisions(page.data.features).useEmbedObjects() && overlay && container && container.payload.visibility === 'public' && (isReportContainer(container) || isProgramContainer(container) || isMeasureContainer(container) || isSimpleMeasureContainer(container) || (isGoalContainer(container) && createFeatureDecisions(page.data.features).useIOOI()) || isOrganizationContainer(container) || isOrganizationalUnitContainer(container))}
			<OverlaySettingsDropdown {container} relatedContainers={page.data.relatedContainers ?? []} />
		{/if}
	</div>
</header>

<div class="commands" data-sveltekit-keepfocus>
	{#if !isOnPage && (!container || isOrganizationContainer(container) || isOrganizationalUnitContainer(container))}
		<div class="commands-leading">
			<ViewSelect />
		</div>
	{/if}

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
			<span class="is-visually-hidden is-visually-hidden--mobile-only">{$_('sort')}</span>
		</button>
	{/if}

	{#if container && isReportContainer(container)}
		<button
			class="button button-xs button-primary"
			type="button"
			use:compareBar.button
			onclick={() => {
				filterBar.close();
				sortBar.close();
			}}
		>
			<Compare />
			<span>{$_('compare_data')}</span>
		</button>
	{/if}
</div>

{#if $filterBar.expanded || $sortBar.expanded || $compareBar.expanded}
	<div class="filter-and-sort" data-sveltekit-keepfocus>
		{#if $filterBar.expanded}
			<fieldset use:filterBar.panel>
				{#if activeFilters > 0}
					<span>{$_('active_filters', { values: { count: activeFilters } })}</span>

					<button class="button-outline button-xs" onclick={resetFilters} type="button">
						<Close />
					</button>
				{/if}

				{#each facets.entries() as [key, foci] (key)}
					{@const labelOverride = facetLabels.get(key)}
					{@const categoryOptionList = categoryOptions[key]}
					{@const options = categoryOptionList
						? categoryOptionList.map((option) => ({
								...option,
								count:
									foci.get(option.value) ?? (option.guid ? foci.get(option.guid) : undefined) ?? 0,
								subOptions: option.subOptions?.map((sub) => ({
									...sub,
									count: foci.get(sub.value) ?? (sub.guid ? foci.get(sub.guid) : undefined) ?? 0
								}))
							}))
						: [...foci.entries()]
								.map(([k, v]) => ({
									count: v,
									label: facetLabels.get(k) ?? $_(k),
									value: k,
									subOptions: undefined
								}))
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
					{:else if options.some(({ count, subOptions }) => (count ?? 0) > 0 || subOptions?.some((s) => (s.count ?? 0) > 0)) || (overlay && paramsFromFragment(page.url).has(key)) || (!overlay && page.url.searchParams.has(key))}
						<FilterDropDown {key} {options} label={labelOverride} />
					{/if}
				{/each}
			</fieldset>
		{:else if $sortBar.expanded}
			<fieldset use:sortBar.panel>
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
		{:else}
			<CompareBar disclosure={compareBar} />
		{/if}
	</div>
{/if}

<style>
	header {
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-chevron-icon-size: 1rem;

		--icon-color: var(--color-gray-500);

		align-items: center;
		background: white;
		color: var(--color-gray-700);
		container-type: inline-size;
		display: flex;
		flex-shrink: 0;
		font-size: 0.875rem;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		z-index: 3;
	}

	header :global(svg) {
		color: var(--icon-color);
	}

	.actions {
		align-items: center;
		display: flex;
		gap: 0.75rem;
		margin-left: auto;
	}

	.commands {
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-chevron-icon-size: 1rem;

		--indicator-background-color: var(--color-primary-700);

		align-items: center;
		container-type: inline-size;
		display: flex;
		flex-wrap: wrap;
		font-size: 0.875rem;
		gap: 0.75rem;
		justify-content: end;
		padding: 0 0.75rem 0.5rem;
		z-index: 2;
	}

	.commands > * {
		width: fit-content;
	}

	.commands-leading {
		margin-right: auto;
	}

	.action-button--favorite {
		--icon-color: var(--color-yellow-400);
	}

	.divider {
		border-left: solid 1px var(--color-gray-200);
		height: 1.5rem;
	}

	.dropdown-button.dropdown-button--command {
		--dropdown-button-default-background: transparent;
		--dropdown-button-padding: 0 0.5rem 0 0.5rem;

		height: 2rem;
		position: relative;
	}

	.filter-and-sort {
		padding: 0 0.75rem;
	}

	.filter-and-sort fieldset {
		--dropdown-button-padding: 0.5rem 0.625rem;

		--indicator-background-color: var(--color-primary-700);

		align-items: center;
		background-color: var(--color-primary-050);
		border: 1px solid var(--color-primary-200);
		border-radius: 9999rem;
		display: flex;
		flex-direction: row;
		font-size: 0.875rem;
		gap: 0.25rem;
		justify-content: safe center;
		overflow: auto;
		padding: 0.375rem;
	}

	.filter-and-sort fieldset > :global(*) {
		flex-shrink: 0;
		justify-content: safe center;
	}

	.filter-and-sort span[aria-hidden='true'] {
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

	.mobile-menu-button {
		align-items: center;
		border: none;
		border-radius: 8px;
		display: none;
		height: 2rem;
		justify-content: center;
		padding: 0.5rem;
		width: 2rem;
	}

	.mobile-menu-button:hover {
		background-color: var(--color-gray-100);
	}

	@media (max-width: 480px) {
		.mobile-menu-button {
			display: inline-flex;
		}
	}
</style>
