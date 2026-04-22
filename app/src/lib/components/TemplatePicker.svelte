<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import saveContainer from '$lib/client/saveContainer';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		audience,
		computeFacetCount,
		type CustomCollectionContainer,
		indicatorCategories,
		type PayloadType,
		payloadTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { sortIcons } from '$lib/theme/models';

	interface Props {
		container: CustomCollectionContainer;
		dialog?: HTMLDialogElement;
	}

	let { container = $bindable(), dialog = $bindable() }: Props = $props();

	let filter = $state({ ...container.payload.filter });

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
		...(createFeatureDecisions(page.data.features).usePage() ? [payloadTypes.enum.page] : []),
		payloadTypes.enum.program,
		...(createFeatureDecisions(page.data.features).useReport() ? [payloadTypes.enum.report] : []),
		payloadTypes.enum.task
	] satisfies PayloadType[]);

	const categoryContext = $derived(
		page.data.categoryContext
			? filterCategoryContext(
					page.data.categoryContext,
					filter.type && filter.type.length > 0 ? filter.type : defaultPayloadType,
					{
						matchAll: true
					}
				)
			: undefined
	);

	let facets = $derived.by(() => {
		const facets = new Map([
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['type', new Map(defaultPayloadType.map((v) => [v as string, 0]))],
			...(createFeatureDecisions(page.data.features).useCustomCategories()
				? (categoryContext?.keys.map((k) => [
						k,
						new Map(categoryContext.options[k].map((v) => [v.value, 0]))
					]) ?? [])
				: [
						['audience', new Map(audience.options.map((v) => [v as string, 0]))],
						['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
						['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
						['topic', new Map(topics.options.map((v) => [v as string, 0]))]
					])
		] as [string, Map<string, number>][]);

		return computeFacetCount(facets, searchResource.current ?? [], {
			useCategoryPayload: createFeatureDecisions(page.data.features).useCustomCategories()
		});
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
							indicatorCategory: filter.indicatorCategory,
							organization: [page.data.currentOrganization.guid],
							payloadType: filter.type && filter.type.length > 0 ? filter.type : defaultPayloadType,
							...(createFeatureDecisions(page.data.features).useCustomCategories()
								? Object.fromEntries(
										categoryContext?.keys.map((k) => (k in filter ? [[k], filter[k]] : [])) ?? []
									)
								: {
										audience: filter.audience,
										policyFieldBNK: filter.policyFieldBNK,
										topic: filter.topic,
										sdg: filter.sdg
									}),
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
				categoryContext?.options[key]?.map((option) => ({
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
					label={categoryContext?.labels.get(key)}
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

	{#snippet content()}
		<div class="result-and-preview">
			<div class="result">
				<ul class="inline-actions">
					<li>
						<!-- svelte-ignore a11y_autofocus -->
						<button autofocus class="button-red" onclick={() => dialog?.close()} type="button">
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
									inputType="checkbox"
									{onchange}
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="preview">
				<button class="button-primary" disabled={selected.length === 0} onclick={confirm}>
					{$_('custom_collection.dialog.accept_selection', {
						values: { count: selected.length }
					})}
				</button>
				<ul>
					{#each selected as guid (guid)}
						{@const item = searchResource.current?.find((item) => item.guid === guid)}
						{#if item}
							<li class="preview-item">
								<input bind:group={selected} name="selected" type="checkbox" value={guid} />

								{#if 'name' in item.payload}
									{item.payload.name}
								{:else if 'title' in item.payload}
									{item.payload.title}
								{/if}
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		</div>
	{/snippet}
</PickerDialog>

<style>
	.result-and-preview {
		display: flex;
		flex-direction: row;
		flex-grow: 1;
		gap: 1.5rem;
		margin-top: 1rem;
		min-height: 1px;
	}

	.result {
		display: flex;
		flex-direction: column;
		min-height: 1px;
	}

	.result .inline-actions {
		margin-left: 0;
		margin-top: 1rem;
	}

	.result .inline-actions > li:last-child {
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

	.preview {
		background-color: var(--color-white);
		border: solid 1px var(--color-gray-200);
		border-radius: 24px;
		display: flex;
		flex-direction: column;
		flex-basis: 20rem;
		flex-shrink: 0;
		height: 100%;
		padding: 1rem;
	}

	.preview > button {
		justify-content: center;
		width: 100%;
	}

	.preview > ul {
		overflow: auto;
	}

	.preview-item {
		align-items: center;
		background-color: var(--color-gray-050);
		border: solid 1px var(--color-gray-200);
		border-radius: 8px;
		color: var(--color-gray-700);
		display: flex;
		font-weight: 500;
		gap: 0.5rem;
		margin-top: 1rem;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0.375rem;
	}
</style>
