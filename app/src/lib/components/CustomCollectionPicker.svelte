<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import CheckCircle from '~icons/flowbite/check-circle-outline';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import saveContainer from '$lib/client/saveContainer';
	import Card from '$lib/components/Card.svelte';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		audience,
		computeFacetCount,
		type CustomCollectionContainer,
		indicatorCategories,
		isOrganizationalUnitContainer,
		type PayloadType,
		payloadTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { sortIcons } from '$lib/theme/models';

	interface Props {
		container: CustomCollectionContainer;
		dialog: HTMLDialogElement;
	}

	let { container = $bindable(), dialog = $bindable() }: Props = $props();

	let filter = $state({ ...container.payload.filter });

	let selected = $state(container.payload.item);

	let sort = $state(container.payload.sort);

	let terms = $state(container.payload.terms);

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });

	let sortBar = createDisclosure({ label: $_('sort') });

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
					filter.type.length > 0 ? filter.type : defaultPayloadType,
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

	// svelte-ignore state_referenced_locally
	let mode: 'select' | 'apply_rule' = $state(
		selected.length > 0 || activeFilters == 0 ? 'select' : 'apply_rule'
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
							payloadType: filter.type.length > 0 ? filter.type : defaultPayloadType,
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

	function handleRemoveFilterValue(key: string, value: string) {
		if (key in filter) {
			filter = { ...filter, [key]: filter[key as keyof typeof filter].filter((v) => v !== value) };
		}
	}

	async function confirm() {
		const response = await saveContainer({
			...container,
			payload: {
				...container.payload,
				filter,
				item: mode == 'select' ? selected : [],
				sort,
				terms
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
	title={$_('custom_collection.dialog.title')}
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
		<div class="result-and-preview">
			<div class="result">
				<ul class="inline-actions">
					<li>
						<div class="segmented-button">
							<label class="button">
								<CheckCircle />
								{$_('custom_collection.dialog.select')}
								<input name="mode" type="radio" value="select" bind:group={mode} />
							</label>
							<label class="button">
								<LightningBolt />
								{$_('custom_collection.dialog.apply_rule')}
								<input name="mode" type="radio" value="apply_rule" bind:group={mode} />
							</label>
						</div>
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
								{#if mode === 'select'}
									<SelectableCard
										--height="100%"
										checked={selected.includes(item.guid)}
										container={item}
										inputType="checkbox"
										{onchange}
									/>
								{:else if isOrganizationalUnitContainer(item)}
									<OrganizationCard --height="100%" container={item} />
								{:else}
									<Card --height="100%" container={item} />
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="preview">
				<button
					class="button-primary"
					disabled={mode === 'select' && selected.length === 0}
					onclick={confirm}
				>
					{#if mode === 'select'}
						{$_('custom_collection.dialog.accept_selection', {
							values: { count: selected.length }
						})}
					{:else}
						{$_('custom_collection.dialog.apply_rule')}
					{/if}
				</button>
				{#if mode === 'select' && selected.length > 0}
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
				{:else if mode === 'apply_rule' && searchResource.current}
					<ul>
						{#each Object.entries(filter) as [key, valueList] (key)}
							{#if valueList.length > 0}
								{#each valueList as value (value)}
									<li class="preview-item">
										<LightningBolt />
										{page.data.categoryContext?.labels.get(value) ?? $_(value)}
										<button
											class="button button-remove"
											type="button"
											onclick={() => handleRemoveFilterValue(key, value)}
										>
											<CloseCircle />
											<span class="is-visually-hidden">{$_('remove')}</span>
										</button>
									</li>
								{/each}
							{/if}
						{/each}
					</ul>
				{/if}
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

	.segmented-button {
		--button-border-color: var(--color-blue-gray-200);

		border: solid var(--button-border-color);
		border-radius: 8px;
		border-width: 1px 0 0 1px;
		color: var(--color-blue-gray-800);
		display: flex;
	}

	.segmented-button > .button {
		--button-active-background: var(--color-blue-gray-300);
		--button-background: var(--color-white);
		--button-hover-background: var(--color-blue-gray-200);

		border-width: 0 1px 1px 0;
	}

	.segmented-button > .button:active {
		border-color: var(--color-blue-gray-300);
	}

	.segmented-button > .button:first-child {
		border-bottom-right-radius: 0;
		border-top-right-radius: 0;
	}

	.segmented-button > .button:last-child {
		border-bottom-left-radius: 0;
		border-top-left-radius: 0;
	}

	.segmented-button input {
		appearance: none;
	}

	.segmented-button .button:has(input:checked) {
		background-color: var(--color-blue-gray-800);
		border-color: var(--color-blue-gray-800);
		color: var(--color-white);
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

	.button-remove {
		--button-active-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0;
		--padding-y: 0.375rem;

		border: none;
		flex-shrink: 0;
		margin-left: auto;
	}

	.button-remove > :global(svg) {
		color: var(--color-gray-500);
		max-width: none;
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

	.preview-item > :global(svg) {
		flex-shrink: 0;
		max-width: none;
	}
</style>
