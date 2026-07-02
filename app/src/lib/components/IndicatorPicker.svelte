<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import {
		computeFacetCount,
		indicatorCategories,
		indicatorTemplateContainer,
		indicatorTypes,
		payloadTypes
	} from '$lib/models';
	import { sortIcons } from '$lib/theme/models';
	import Close from '~icons/knotdots/close';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });

	let sortBar = createDisclosure({ label: $_('sort') });

	const categoryContext = $derived(
		filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.indicator_template])
	);

	let filter = $state<Record<string, string[]>>({
		...Object.fromEntries(categoryContext.keys.map((k) => [k, []])),
		indicatorCategory: [],
		indicatorType: []
	});

	let sort = $state('alpha');

	let terms = $state('');

	let selected = $state([]) as string[];
	let knownIndicators = new SvelteMap<string, z.infer<typeof indicatorTemplateContainer>>();

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0)
	);

	const mode = 'select';

	const searchResource = resource(
		[() => $state.snapshot(filter), () => sort, () => terms],
		async ([filter, sort, terms], _, { signal }) => {
			const params = new URLSearchParams([
				...filter.indicatorCategory.map((v) => ['indicatorCategory', v]),
				...filter.indicatorType.map((v) => ['indicatorType', v]),
				['payloadType', payloadTypes.enum.indicator_template],
				['sort', sort],
				['terms', terms],
				...categoryContext.keys.flatMap((k) => (k in filter ? filter[k].map((v) => [k, v]) : []))
			]);

			const response = await fetch(`/container?${params.toString()}`, { signal });
			return z.array(indicatorTemplateContainer).parse(await response.json());
		},
		{
			debounce: 300
		}
	);

	$effect(() => {
		for (const indicator of searchResource.current ?? []) {
			knownIndicators.set(indicator.guid, indicator);
		}
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			...buildCategoryFacetsWithCounts(categoryContext.options),
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['indicatorTypes', new Map(indicatorTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, searchResource.current ?? []);
	});

	function resetFilters() {
		for (const key in filter) {
			filter[key] = [];
		}
	}

	function selectAll() {
		selected = (searchResource.current ?? []).map(({ guid }) => guid);
	}

	function unselectAll() {
		selected = [];
	}

	async function performImport() {
		const response = await fetch(
			`/${(page.data.currentOrganizationalUnit ?? page.data.currentOrganization).guid}/import-actual-data`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams(selected.map((guid) => ['indicator', guid]))
			}
		);
		if (response.ok) {
			await invalidate('containers');
			dialog.close();
		} else {
			alert($_('indicator_picker.import_failed'));
			console.log(await response.json());
		}
	}

	function onchange(event: Event & { currentTarget: HTMLInputElement }) {
		selected = event.currentTarget.checked
			? [...selected, event.currentTarget.value]
			: selected.filter((guid) => guid !== event.currentTarget.value);
	}
</script>

<PickerDialog
	bind:dialog
	bind:terms
	{activeFilters}
	{filterBar}
	{sortBar}
	onResetFilters={resetFilters}
	title={$_('indicator_picker.title')}
>
	{#snippet filterContent()}
		{#each facets.entries() as [key, foci] (key)}
			{@const options =
				categoryContext.options[key]?.map((option) => ({
					...option,
					count: foci.get(option.value) ?? foci.get(option.guid) ?? 0,
					subOptions: option.subOptions?.map((sub) => ({
						...sub,
						count: foci.get(sub.value) ?? foci.get(sub.guid) ?? 0
					}))
				})) ??
				[...foci.entries()]
					.map(([k, v]) => ({ count: v, label: $_(k), value: k }))
					.toSorted((a, b) =>
						a.label.localeCompare(b.label, undefined, {
							numeric: true,
							sensitivity: 'base'
						})
					)}
			{#if options.some(({ count }) => count > 0)}
				<InlineFilterDropDown
					bind:value={() => filter[key] ?? [], (v) => (filter[key] = v)}
					{key}
					label={categoryContext.labels.get(key)}
					{mode}
					{options}
				/>
			{/if}
		{/each}
	{/snippet}

	{#snippet sortContent()}
		{@const sortOptions = [
			[$_('sort_alphabetically'), 'alpha'],
			[$_('sort_modified'), 'modified']
		]}
		<legend class="is-visually-hidden">{$_('sort')}</legend>
		<span aria-hidden="true">{$_('sort')}</span>
		{#each sortOptions as [label, value] (value)}
			{@const Icon = sortIcons.get(value)}
			<label class="sort-option">
				<input type="radio" {value} bind:group={sort} />
				<Icon />
				{label}
			</label>
		{/each}
	{/snippet}

	{#snippet commands()}
		<label>
			<input
				onclick={(e) => (e.currentTarget.checked ? selectAll() : unselectAll())}
				type="checkbox"
			/>
			{$_('select_all')}
		</label>
	{/snippet}

	{#snippet main()}
		<div class="result">
			{#if searchResource.current}
				<ul class="catalog">
					{#each searchResource.current as item (item.guid)}
						<li>
							<SelectableCard
								--height="100%"
								checked={selected.includes(item.guid)}
								container={item}
								{onchange}
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/snippet}

	{#snippet selection()}
		<div class="selection-panel">
			<div class="selection-actions">
				<button
					class="selection-clear"
					disabled={selected.length === 0}
					onclick={unselectAll}
					type="button"
				>
					<Close />
					<span>{$_('picker_dialog.clear')}</span>
				</button>
				<button
					class="button-primary selection-apply"
					disabled={selected.length === 0}
					onclick={performImport}
					type="button"
				>
					{$_('picker_dialog.confirm', { values: { count: selected.length } })}
				</button>
			</div>

			{#if selected.length > 0}
				<ul class="selection-list">
					{#each selected as guid (guid)}
						{@const item = knownIndicators.get(guid)}
						{#if item}
							{@const selectionId = `selected-${guid}`}
							<li class="selection-item">
								<input id={selectionId} type="checkbox" value={guid} bind:group={selected} />
								<label for={selectionId}>
									{item.payload.title}
								</label>
							</li>
						{/if}
					{/each}
				</ul>
			{/if}
		</div>
	{/snippet}
</PickerDialog>

<style>
	.result {
		display: flex;
		flex-direction: column;
		min-height: 1px;
	}

	.catalog {
		margin-top: 1rem;
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
</style>
