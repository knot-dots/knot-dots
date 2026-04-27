<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import ClipboardIcon from '~icons/flowbite/clipboard-clean-solid';
	import { page } from '$app/state';
	import createPaginatedResource from '$lib/client/createPaginatedResource.svelte';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import {
		administrativeTypes,
		payloadTypes,
		type OrganizationalUnitContainer,
		organizationalUnitContainer
	} from '$lib/models';

	interface Props {
		dialog: HTMLDialogElement;
		selected: OrganizationalUnitContainer[];
	}

	let { dialog = $bindable(), selected = $bindable() }: Props = $props();

	let filterBar = createDisclosure({ label: $_('filters'), expanded: false });
	let sortBar = createDisclosure({ label: $_('sort'), expanded: false });

	let terms = $state('');
	let localSelected: string[] = $state([]);

	const categoryContext = $derived(
		page.data.categoryContext
			? filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.organizational_unit])
			: undefined
	);

	// svelte-ignore state_referenced_locally
	let filter = $state<Record<string, string[]>>({
		administrativeType: [],
		federalState: [],
		...(categoryContext ? Object.fromEntries(categoryContext.keys.map((key) => [key, []])) : {})
	});

	const federalStates = [
		'Baden-Württemberg',
		'Bayern',
		'Berlin',
		'Brandenburg',
		'Bremen',
		'Hamburg',
		'Hessen',
		'Mecklenburg-Vorpommern',
		'Niedersachsen',
		'Nordrhein-Westfalen',
		'Rheinland-Pfalz',
		'Saarland',
		'Sachsen',
		'Sachsen-Anhalt',
		'Schleswig-Holstein',
		'Thüringen'
	];

	const sidebarAdministrativeTypes = [
		administrativeTypes.enum['administrative_type.municipality'],
		administrativeTypes.enum['administrative_type.rural_district'],
		administrativeTypes.enum['administrative_type.federal_state'],
		administrativeTypes.enum['administrative_type.country']
	] as const;

	const PAGE_SIZE = 50;
	const MAX_SELECTION = 5;

	// Maintain a map of all encountered municipalities to preserve selections
	// even if they are no longer in the current visible list (e.g. after search)
	let knownMunicipalities = new SvelteMap<string, OrganizationalUnitContainer>();

	// Reset pagination when search terms or filters change
	const filterKey = $derived(`${Object.values(filter).join(',')}|${terms}`);

	const municipalities = createPaginatedResource({
		pageSize: PAGE_SIZE,
		resetKey: () => filterKey,
		getKey: (municipality: OrganizationalUnitContainer) => municipality.guid,
		fetchPage: async ({ limit, offset, signal }) => {
			const params = new URLSearchParams();
			params.append('organization', page.data.currentOrganization.guid);
			params.append('payloadType', payloadTypes.enum.organizational_unit);

			const currentFilter = $state.snapshot(filter);
			for (const key in currentFilter) {
				for (const value of currentFilter[key]) {
					params.append(key, value);
				}
			}

			if (terms) {
				params.append('terms', terms);
			}

			params.append('limit', String(limit));
			params.append('offset', String(offset));
			params.append('sort', 'alpha');

			const response = await fetch(`/container?${params.toString()}`, { signal });
			return z.array(organizationalUnitContainer).parse(await response.json());
		},
		debounce: 300
	});

	const allMunicipalities = $derived(municipalities.items);

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0)
	);

	type FederalLevelKey = 'all' | (typeof sidebarAdministrativeTypes)[number];

	let federalLevelItems = $derived.by(() => {
		const countsByType = new Map<string, number>();

		for (const municipality of allMunicipalities) {
			const type = municipality.payload.administrativeType;
			if (!type) continue;

			if (Array.isArray(type)) {
				for (const singleType of type) {
					countsByType.set(singleType, (countsByType.get(singleType) ?? 0) + 1);
				}
			} else {
				countsByType.set(type, (countsByType.get(type) ?? 0) + 1);
			}
		}

		return [
			{ key: 'all', label: $_('all'), count: allMunicipalities.length },
			...sidebarAdministrativeTypes.map((type) => ({
				key: type,
				label: $_(type),
				count: countsByType.get(type) ?? 0
			}))
		] as Array<{ key: FederalLevelKey; label: string; count: number }>;
	});

	let activeFederalLevel = $derived.by(() => {
		if (filter.administrativeType.length === 0) return 'all';
		if (filter.administrativeType.length === 1) {
			return filter.administrativeType[0] as FederalLevelKey;
		}
		return null;
	});

	function resetFilters() {
		for (const key in filter) {
			filter[key] = [];
		}
	}

	function selectFederalLevel(level: FederalLevelKey) {
		if (level === 'all') {
			filter.administrativeType = [];
			return;
		}

		filter.administrativeType = [level];
	}

	function clearSelection() {
		localSelected = [];
	}

	function cancel() {
		dialog.close();
	}

	function confirm() {
		selected = localSelected
			.map((guid) => knownMunicipalities.get(guid))
			.filter((m): m is OrganizationalUnitContainer => !!m);
		dialog.close();
	}

	// Initialize local selection from parent and track their objects
	$effect(() => {
		if (dialog && selected) {
			localSelected = selected.map((s) => s.guid);
			for (const s of selected) {
				knownMunicipalities.set(s.guid, s);
			}
		}
	});

	$effect(() => {
		for (const municipality of municipalities.current ?? []) {
			knownMunicipalities.set(municipality.guid, municipality);
		}
	});

	function onchange(event: Event & { currentTarget: HTMLInputElement }) {
		localSelected = event.currentTarget.checked
			? [...localSelected, event.currentTarget.value]
			: localSelected.filter((guid) => guid !== event.currentTarget.value);
	}
</script>

<PickerDialog
	bind:dialog
	bind:terms
	{activeFilters}
	{filterBar}
	{sortBar}
	onResetFilters={resetFilters}
	title={$_('compare_search_municipality')}
>
	{#snippet filterContent()}
		<InlineFilterDropDown
			key="administrativeType"
			mode="select"
			options={administrativeTypes.options.map((t) => ({ label: $_(t), value: t }))}
			bind:value={filter.administrativeType}
		/>
		<InlineFilterDropDown
			key="federalState"
			mode="select"
			options={federalStates.map((s) => ({ label: s, value: s }))}
			bind:value={filter.federalState}
		/>
		{#if categoryContext}
			{#each categoryContext.keys as key (key)}
				<InlineFilterDropDown
					{key}
					label={categoryContext.labels.get(key)}
					mode="select"
					options={categoryContext.options[key]}
					bind:value={() => filter[key] ?? [], (v) => (filter[key] = v)}
				/>
			{/each}
		{/if}
	{/snippet}

	{#snippet sortContent()}
		<!-- No sorting options needed -->
	{/snippet}

	{#snippet content()}
		<div class="result">
			<div class="actions">
				<button
					class="button-outline button-xs"
					disabled={localSelected.length === 0}
					onclick={clearSelection}
					type="button"
				>
					{$_('compare_clear_all')}
				</button>

				<span class="selection-count">
					{$_('compare_municipalities_selected', { values: { count: localSelected.length } })}
					{#if localSelected.length >= MAX_SELECTION}
						<span class="max-indicator">
							({$_('compare_max_reached', { values: { max: MAX_SELECTION } })})
						</span>
					{/if}
				</span>

				<div class="actions-right">
					<button class="button-red" onclick={cancel} type="button">
						{$_('custom_collection.dialog.cancel')}
					</button>
					<button
						class="button-primary"
						disabled={localSelected.length === 0}
						onclick={confirm}
						type="button"
					>
						{$_('custom_collection.dialog.accept_selection', {
							values: { count: localSelected.length }
						})}
					</button>
				</div>
			</div>

			<div class="picker-layout">
				<aside class="federal-levels-panel">
					<span class="federal-levels-title" id="federal-levels-title">
						{$_('compare_federal_levels')}
					</span>
					<ul aria-labelledby="federal-levels-title" class="federal-levels-list" role="radiogroup">
						{#each federalLevelItems as item (item.key)}
							<li>
								<label class="federal-level-item">
									<ClipboardIcon />
									<input
										class="is-visually-hidden"
										type="radio"
										name="federal-level"
										value={item.key}
										checked={activeFederalLevel === item.key}
										onchange={() => selectFederalLevel(item.key)}
									/>
									<span class="federal-level-label">{item.label}</span>
								</label>
							</li>
						{/each}
					</ul>
				</aside>

				<div class="catalog-area">
					<ul class="catalog">
						{#each allMunicipalities as municipality (municipality.guid)}
							{@const isDisabled =
								!localSelected.includes(municipality.guid) && localSelected.length >= MAX_SELECTION}
							<li class:disabled={isDisabled}>
								<SelectableCard
									--height="100%"
									checked={localSelected.includes(municipality.guid)}
									container={municipality}
									{onchange}
								/>
							</li>
						{/each}
						<LazyLoadSentinel
							as="li"
							disabled={allMunicipalities.length === 0}
							hasMore={municipalities.hasMore}
							loading={municipalities.loadingMore}
							onLoadMore={municipalities.loadMore}
						/>
					</ul>
				</div>

				<aside class="selection-panel">
					<div class="selection-header">
						<span class="selection-title">{$_('compare_with')}</span>
						<span class="selection-count-pill">{localSelected.length}</span>
					</div>

					<ul class="selection-list">
						{#each localSelected as guid (guid)}
							{@const item = knownMunicipalities.get(guid)}
							{#if item}
								{@const selectionId = `selected-${guid}`}
								<li class="selection-item">
									<input id={selectionId} type="checkbox" value={guid} bind:group={localSelected} />
									<label for={selectionId}>
										{#if 'title' in item.payload}
											{item.payload.title}
										{:else if 'name' in item.payload}
											{item.payload.name}
										{/if}
									</label>
								</li>
							{/if}
						{/each}
					</ul>
				</aside>
			</div>
		</div>
	{/snippet}
</PickerDialog>

<style>
	.result {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
		min-height: 1px;
	}

	.actions {
		align-items: center;
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		padding: 0.5rem 0;
	}

	.actions-right {
		align-items: center;
		display: flex;
		gap: 0.75rem;
		margin-left: auto;
	}

	.selection-count {
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.max-indicator {
		color: var(--color-orange-600);
		font-weight: 600;
	}

	.button-red {
		--button-background: transparent;

		border: solid 1px var(--color-red-700);
		color: var(--color-red-700);
	}

	.button-red:active,
	.button-red:hover {
		color: var(--color-white);
	}

	.picker-layout {
		display: grid;
		gap: 1.5rem;
		grid-template-columns: 13rem minmax(0, 1fr) 16.5rem;
		min-height: 0;
	}

	.federal-levels-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		overflow: auto;
	}

	.federal-levels-title {
		color: var(--color-gray-800);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.federal-levels-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		list-style: none;
		margin: 0;
		overflow: auto;
		padding: 0;
	}

	.federal-level-item {
		align-items: flex-start;
		align-self: stretch;
		background: var(--color-gray-050);
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		color: var(--color-gray-600);
		display: flex;
		gap: 6px;
		height: 72px;
		padding: 12px;
	}

	.federal-level-item :global(svg) {
		color: var(--color-gray-400);
	}

	.federal-level-item:hover {
		background-color: var(--color-gray-100);
	}

	.federal-level-item:has(> input:checked) {
		background-color: var(--color-gray-200);
		border-color: var(--color-gray-200);
		color: var(--color-gray-800);
		font-weight: 600;
	}

	.federal-level-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.catalog-area {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.catalog li.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.selection-panel {
		background: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		padding: 1rem;
	}

	.selection-header {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
	}

	.selection-title {
		color: var(--color-gray-800);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.selection-count-pill {
		background: var(--color-primary-700);
		border-radius: 999px;
		color: var(--color-white);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
	}

	.selection-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		overflow: auto;
		padding: 0;
	}

	.selection-item {
		align-items: center;
		background: var(--color-gray-050);
		border-radius: 8px;
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
	}

	.selection-item input {
		accent-color: var(--color-primary-700);
	}

	.selection-item label {
		color: var(--color-gray-800);
		font-size: 0.875rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (width <= 1200px) {
		.picker-layout {
			grid-template-columns: 13rem minmax(0, 1fr);
		}

		.selection-panel {
			grid-column: 1 / -1;
		}
	}

	@media (width <= 900px) {
		.picker-layout {
			grid-template-columns: minmax(0, 1fr);
		}

		.federal-levels-list {
			flex-direction: row;
		}

		.federal-levels-list > li {
			flex-shrink: 0;
		}
	}
</style>
