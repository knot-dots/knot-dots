<script lang="ts">
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
					bind:value={filter[key as keyof typeof filter] as string[]}
					{key}
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

	{#snippet content()}
		<div class="result">
			<ul class="inline-actions">
				<li>
					<label>
						<input
							onclick={(e) => (e.currentTarget.checked ? selectAll() : unselectAll())}
							type="checkbox"
						/>
						{$_('select_all')}
					</label>
				</li>
				<li>
					<button
						class="button-primary"
						disabled={selected.length === 0}
						onclick={performImport}
						type="button"
					>
						{$_('indicator_picker.import', { values: { count: selected.length } })}
					</button>
				</li>
				<li>
					<!-- svelte-ignore a11y_autofocus -->
					<button class="button-red" autofocus>
						{$_('custom_collection.dialog.cancel')}
					</button>
				</li>
			</ul>

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
</PickerDialog>

<style>
	.result {
		display: flex;
		flex-direction: column;
		min-height: 1px;
	}

	.result :global(.inline-actions) {
		align-items: center;
		margin-left: 0;
		margin-top: 1rem;
	}

	.result :global(.inline-actions label) {
		padding: 0.625rem 1.25rem;
	}

	.result :global(.inline-actions > li:last-child) {
		margin-left: auto;
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
</style>
