<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import saveContainer from '$lib/client/saveContainer';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import {
		computeFacetCount,
		type CustomCollectionContainer,
		indicatorCategories,
		type PayloadType,
		payloadTypes
	} from '$lib/models';
	import { sortIcons } from '$lib/theme/models';

	interface Props {
		container: CustomCollectionContainer;
		dialog?: HTMLDialogElement;
	}

	let { container = $bindable(), dialog = $bindable() }: Props = $props();

	let filter = $state<Record<string, string[]>>({});

	let sort = $state(container.payload.sort);

	let terms = $state('');

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });

	let sortBar = createDisclosure({ label: $_('sort') });

	let selected = $state(container.payload.newItemTemplate);

	const defaultPayloadType = $derived([
		payloadTypes.enum.goal,
		payloadTypes.enum.help,
		payloadTypes.enum.indicator_template,
		payloadTypes.enum.knowledge,
		payloadTypes.enum.measure,
		payloadTypes.enum.organizational_unit,
		payloadTypes.enum.page,
		payloadTypes.enum.program,
		payloadTypes.enum.report,
		payloadTypes.enum.task
	] satisfies PayloadType[]);

	const categoryContext = $derived(
		filterCategoryContext(
			page.data.categoryContext,
			filter.type && filter.type.length > 0 ? filter.type : defaultPayloadType,
			{
				matchAll: true
			}
		)
	);

	let facets = $derived.by(() => {
		const facets = new Map([
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['type', new Map(defaultPayloadType.map((v) => [v as string, 0]))],
			...categoryContext.keys.map((k) => [
				k,
				new Map(categoryContext.options[k].map((v) => [v.value, 0]))
			])
		] as [string, Map<string, number>][]);

		return computeFacetCount(facets, searchResource.current ?? []);
	});

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0)
	);

	const inViewport = new IsInViewport(() => dialog);

	const searchResource = resource(
		[() => $state.snapshot(filter), () => sort, () => terms, () => inViewport.current],
		async ([filter, sort, terms, inViewport], _, { signal }) => {
			return inViewport
				? fetchContainers(
						{
							indicatorCategory: filter.indicatorCategory ?? [],
							organization: [page.data.currentOrganization.guid],
							payloadType: filter.type && filter.type.length > 0 ? filter.type : defaultPayloadType,
							...Object.fromEntries(
								categoryContext.keys.map((k) => (k in filter ? [[k], filter[k]] : []))
							),
							template: 'true',
							terms
						},
						sort,
						{ signal }
					)
				: [];
		},
		{
			debounce: 300,
			lazy: true
		}
	);

	function resetFilters() {
		for (const key in filter) {
			filter[key] = [];
		}
	}

	async function confirm() {
		const response = await saveContainer({
			...container,
			payload: {
				...container.payload,
				newItemTemplate: selected
			}
		});
		if (response.ok) {
			const updatedContainer = await response.json();
			container.payload = updatedContainer.payload;
			container.revision = updatedContainer.revision;
		} else {
			const error = await response.json();
			alert(error.message);
		}
		dialog?.close();
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
	title={$_('template_picker_title')}
>
	{#snippet filterContent()}
		{#each facets.entries() as [key, foci] (key)}
			{@const options =
				categoryContext.options[key]?.map((option) => ({
					...option,
					count: foci.get(option.value) ?? (option.guid ? foci.get(option.guid) : undefined) ?? 0,
					subOptions: option.subOptions?.map((sub) => ({
						...sub,
						count: foci.get(sub.value) ?? (sub.guid ? foci.get(sub.guid) : undefined) ?? 0
					}))
				})) ??
				[...foci.entries()]
					.map(([k, v]) => ({
						count: v,
						label: $_(k),
						value: k,
						subOptions: undefined
					}))
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
					mode="select"
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
								inputType="checkbox"
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
					class="button-outline selection-clear"
					disabled={selected.length === 0}
					onclick={() => (selected = [])}
					type="button"
				>
					<Close />
					<span>{$_('picker_dialog.clear')}</span>
				</button>
				<button
					class="button-primary selection-apply"
					disabled={selected.length === 0}
					onclick={confirm}
					type="button"
				>
					{$_('picker_dialog.confirm', {
						values: { count: selected.length }
					})}
				</button>
			</div>

			{#if selected.length > 0}
				<ul class="selection-list">
					{#each selected as guid (guid)}
						{@const item = searchResource.current?.find((item) => item.guid === guid)}
						{#if item}
							{@const selectionId = `selected-${guid}`}
							<li class="selection-item">
								<input id={selectionId} type="checkbox" value={guid} bind:group={selected} />
								<label for={selectionId}>
									{#if 'name' in item.payload}
										{item.payload.name}
									{:else if 'title' in item.payload}
										{item.payload.title}
									{/if}
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
		min-height: 0;
	}

	.catalog {
		margin-top: 1rem;
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
		flex: 0 0 7.125rem;
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
