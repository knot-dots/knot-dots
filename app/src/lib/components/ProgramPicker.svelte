<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ClipboardIcon from '~icons/flowbite/clipboard-clean-solid';
	import Close from '~icons/knotdots/close';
	import { page } from '$app/state';
	import createPaginatedResource from '$lib/client/createPaginatedResource.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import OrganizationFilterDropDown from '$lib/components/OrganizationFilterDropDown.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import {
		type Container,
		isProgramContainer,
		type Level,
		levels,
		payloadTypes,
		type ProgramPayload,
		programTypes
	} from '$lib/models';

	interface Props {
		dialog: HTMLDialogElement;
		selected: Container<ProgramPayload>[];
	}

	let { dialog = $bindable(), selected = $bindable() }: Props = $props();

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });
	let sortBar = createDisclosure({ label: $_('sort'), expanded: false });

	let terms = $state('');
	let localSelected: string[] = $state([]);

	const categoryContext = $derived(
		filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.program])
	);

	// svelte-ignore state_referenced_locally
	let filter = $state<Record<string, string[]>>({
		level: [],
		programType: [],
		...Object.fromEntries(categoryContext.keys.map((key) => [key, []]))
	});

	let scopeType = $state<'current' | 'all' | 'explicit'>('current');
	let includeSubordinateOrganizationalUnits = $state(true);
	let checkedOrganizations = $state<string[]>([]);
	// Selecting single organizational units is not offered because the API
	// combines organization and organizational unit filters with AND.
	let checkedOrganizationalUnits = $state<string[]>([]);

	let organizationOptions = $derived(
		page.data.organizations.map(({ guid, payload }) => ({ value: guid, label: payload.name }))
	);

	function organizationScopeParams(): Array<[string, string]> {
		switch (scopeType) {
			case 'current':
				return [
					['organization', page.data.currentOrganization.guid],
					// The empty string selects programs without an organizational unit.
					...(includeSubordinateOrganizationalUnits
						? []
						: [['organizationalUnit', ''] as [string, string]])
				];
			case 'explicit':
				return checkedOrganizations.map((guid): [string, string] => ['organization', guid]);
			case 'all':
				return [];
		}
	}

	const PAGE_SIZE = 50;
	const MAX_SELECTION = 5;

	// Maintain a map of all encountered programs to preserve selections
	// even if they are no longer in the current visible list (e.g. after search)
	let knownPrograms = new SvelteMap<string, Container<ProgramPayload>>();

	// Reset pagination when search terms, filters or the organization scope change
	const filterKey = $derived(
		[
			Object.values(filter).join(','),
			terms,
			scopeType,
			includeSubordinateOrganizationalUnits,
			checkedOrganizations.join(',')
		].join('|')
	);

	const programs = createPaginatedResource({
		pageSize: PAGE_SIZE,
		resetKey: () => filterKey,
		getKey: (program: Container<ProgramPayload>) => program.guid,
		fetchPage: async ({ limit, offset, signal }) => {
			const query = new URLSearchParams(organizationScopeParams());
			query.append('type', payloadTypes.enum.program);

			const currentFilter = $state.snapshot(filter);
			for (const key in currentFilter) {
				for (const value of currentFilter[key]) {
					query.append(key, value);
				}
			}

			if (terms) {
				query.append('terms', terms);
			}

			query.append('sort', 'alpha');

			const { containers } = await fetchContainerPage({ fetch, limit, offset, query, signal });
			return containers.filter(isProgramContainer);
		},
		debounce: 300
	});

	const allPrograms = $derived(programs.items);

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0) +
			(scopeType === 'current' && includeSubordinateOrganizationalUnits ? 0 : 1)
	);

	type LevelKey = 'all' | Level;

	let levelItems = $derived([
		{ key: 'all', label: $_('all') },
		...levels.options.map((level) => ({ key: level, label: $_(level) }))
	] as Array<{ key: LevelKey; label: string }>);

	let activeLevel = $derived.by(() => {
		if (filter.level.length === 0) return 'all';
		if (filter.level.length === 1) {
			return filter.level[0] as LevelKey;
		}
		return null;
	});

	function resetFilters() {
		for (const key in filter) {
			filter[key] = [];
		}
		scopeType = 'current';
		includeSubordinateOrganizationalUnits = true;
		checkedOrganizations = [];
	}

	function selectLevel(level: LevelKey) {
		filter.level = level === 'all' ? [] : [level];
	}

	function clearSelection() {
		localSelected = [];
	}

	function confirm() {
		selected = localSelected
			.map((guid) => knownPrograms.get(guid))
			.filter((p): p is Container<ProgramPayload> => !!p);
		dialog.close();
	}

	// Initialize local selection from parent and track their objects
	$effect(() => {
		if (dialog && selected) {
			localSelected = selected.map((s) => s.guid);
			for (const s of selected) {
				knownPrograms.set(s.guid, s);
			}
		}
	});

	$effect(() => {
		for (const program of programs.current ?? []) {
			knownPrograms.set(program.guid, program);
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
	title={$_('review_dialog_title')}
>
	{#snippet commands()}
		<div class="levels-command">
			<span class="is-visually-hidden" id="levels-command-label">
				{$_('compare_federal_levels')}
			</span>
			<SingleChoiceDropdown
				labelledBy="levels-command-label"
				options={levelItems.map(({ key, label }) => ({ value: key, label }))}
				bind:value={() => activeLevel, (value) => selectLevel(value as LevelKey)}
			/>
		</div>
	{/snippet}

	{#snippet filterContent()}
		<OrganizationFilterDropDown
			allowAll
			bind:scope={scopeType}
			bind:includeSubordinateOrganizationalUnits
			bind:organizationValue={checkedOrganizations}
			bind:organizationalUnitValue={checkedOrganizationalUnits}
			mode="select"
			options={organizationOptions}
		/>
		<InlineFilterDropDown
			key="programType"
			mode="select"
			options={programTypes.options.map((t) => ({ label: $_(t), value: t }))}
			bind:value={filter.programType}
		/>
		<InlineFilterDropDown
			key="level"
			label={$_('level.label')}
			mode="select"
			options={levels.options.map((l) => ({ label: $_(l), value: l }))}
			bind:value={filter.level}
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

	{#snippet sidebar()}
		<div class="levels-panel">
			<span class="levels-title" id="levels-title">{$_('compare_federal_levels')}</span>
			<ul aria-labelledby="levels-title" class="levels-list" role="radiogroup">
				{#each levelItems as item (item.key)}
					<li>
						<label class="level-item">
							<ClipboardIcon />
							<input
								class="is-visually-hidden"
								type="radio"
								name="level"
								value={item.key}
								checked={activeLevel === item.key}
								onchange={() => selectLevel(item.key)}
							/>
							<span class="level-label">{item.label}</span>
						</label>
					</li>
				{/each}
			</ul>
		</div>
	{/snippet}

	{#snippet main()}
		<div class="catalog-area">
			<ul class="catalog">
				{#each allPrograms as program (program.guid)}
					{@const isDisabled =
						!localSelected.includes(program.guid) && localSelected.length >= MAX_SELECTION}
					<li class:disabled={isDisabled}>
						<SelectableCard
							--height="100%"
							checked={localSelected.includes(program.guid)}
							container={program}
							{onchange}
						/>
					</li>
				{/each}
				<LazyLoadSentinel
					as="li"
					disabled={allPrograms.length === 0}
					hasMore={programs.hasMore}
					loading={programs.loadingMore}
					onLoadMore={programs.loadMore}
				/>
			</ul>
		</div>
	{/snippet}

	{#snippet selection()}
		<div class="selection-panel">
			<div class="selection-actions">
				<button
					class="selection-clear"
					disabled={localSelected.length === 0}
					onclick={clearSelection}
					type="button"
				>
					<Close />
					<span>{$_('picker_dialog.clear')}</span>
				</button>
				<button
					class="button-primary system-primary selection-apply"
					disabled={localSelected.length === 0}
					onclick={confirm}
					type="button"
				>
					{$_('picker_dialog.confirm', {
						values: { count: localSelected.length }
					})}
				</button>
			</div>

			{#if localSelected.length > 0}
				<ul class="selection-list">
					{#each localSelected as guid (guid)}
						{@const item = knownPrograms.get(guid)}
						{#if item}
							{@const selectionId = `selected-${guid}`}
							<li class="selection-item">
								<input id={selectionId} type="checkbox" value={guid} bind:group={localSelected} />
								<label for={selectionId}>{item.payload.title}</label>
							</li>
						{/if}
					{/each}
				</ul>
			{/if}
		</div>
	{/snippet}
</PickerDialog>

<style>
	.levels-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		overflow: auto;
	}

	.levels-title {
		color: var(--color-gray-800);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.levels-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		list-style: none;
		margin: 0;
		overflow: auto;
		padding: 0;
	}

	.level-item {
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

	.level-item :global(svg) {
		color: var(--color-gray-400);
	}

	.level-item:hover {
		background-color: var(--color-gray-100);
	}

	.level-item:has(> input:checked) {
		background-color: var(--color-gray-200);
		border-color: var(--color-gray-200);
		color: var(--color-gray-800);
		font-weight: 600;
	}

	.level-label {
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
		border: 1px solid var(--color-gray-100);
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-height: 0;
		overflow: hidden;
		padding: 0.5rem;
	}

	.selection-actions {
		align-items: center;
		display: flex;
		gap: 0.25rem;
		width: 100%;
	}

	.selection-actions button {
		height: 2.3125rem;
		justify-content: center;
		white-space: nowrap;
	}

	.selection-clear {
		--icon-color: var(--color-gray-900);

		border-color: var(--color-gray-200);
		color: var(--color-gray-900);
		flex: 1 1 auto;
	}

	.selection-clear:hover:not(:disabled),
	.selection-clear:active:not(:disabled) {
		border-color: var(--color-gray-200);
		color: var(--color-gray-900);
	}

	.selection-clear :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.selection-apply {
		flex: 1 1 auto;
		min-width: 0;
	}

	.selection-list {
		display: none;
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

	@container (min-width: 48rem) {
		.selection-list {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			margin: 0;
			overflow: auto;
			padding: 0;
		}
	}

	@container (min-width: 75rem) {
		.levels-command {
			display: none;
		}
	}
</style>
