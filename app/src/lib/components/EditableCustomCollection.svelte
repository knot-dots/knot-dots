<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
	import { z } from 'zod';
	import CheckCircle from '~icons/flowbite/check-circle-solid';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import ArrowRight from '~icons/knotdots/arrow-right';
	import Collection from '~icons/knotdots/collection';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import Search from '~icons/knotdots/search';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import fetchContainers from '$lib/client/fetchContainers';
	import saveContainer from '$lib/client/saveContainer';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import CustomCollectionSettingsDropdown from '$lib/components/CustomCollectionSettingsDropdown.svelte';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import SortDropdown from '$lib/components/SortDropdown.svelte';
	import {
		type ActualDataContainer,
		actualDataContainer,
		type AnyContainer,
		audience,
		computeFacetCount,
		type CustomCollectionContainer,
		indicatorCategories,
		isActualDataContainer,
		isIndicatorTemplateContainer,
		payloadTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { ability, compareState } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';

	const MAX_ITEMS_PER_PAGE = 50;

	const sortOptions = [
		{ value: 'modified', label: $_('sort_modified') },
		{ value: 'alpha', label: $_('sort_alphabetically') }
	];

	interface Props {
		container: CustomCollectionContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let dialog: HTMLDialogElement = $state(undefined!);

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });
	let sortBar = createDisclosure({ label: $_('sort') });
	const defaultPayloadType = [
		payloadTypes.enum.indicator_template,
		payloadTypes.enum.program,
		payloadTypes.enum.goal,
		payloadTypes.enum.measure
	];

	let facets = $derived.by(() => {
		const facets = new Map([
			['type', new Map(defaultPayloadType.map((v) => [v as string, 0]))],
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['audience', new Map(audience.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, searchResource.current ?? []);
	});

	let filter = $state({ ...container.payload.filter });

	let sort = $state(container.payload.sort);

	let terms = $state(container.payload.terms);

	let localTerms = $state('');

	let localSort = $state(container.payload.sort);

	let visibleCount = $state(MAX_ITEMS_PER_PAGE);

	let selected = $state(container.payload.item);

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0)
	);

	// svelte-ignore state_referenced_locally
	let mode: 'select' | 'apply_rule' = $state(
		selected.length > 0 || activeFilters == 0 ? 'select' : 'apply_rule'
	);

	const idForTitle = crypto.randomUUID();

	let header = $state<HTMLElement>();

	const inViewport = new IsInViewport(() => header);

	const savedResource = resource(
		[
			() => $state.snapshot(container.payload.filter),
			() => container.payload.terms,
			() => (container.payload.allowSearch ? localTerms.trim() : ''),
			() => (container.payload.allowSort ? localSort : container.payload.sort),
			() => inViewport.current
		],
		async ([filter, terms, searchTerms, sort], _, { signal }) => {
			const type = filter.type.length > 0 ? filter.type : defaultPayloadType;
			const combinedTerms = [terms.trim(), searchTerms].filter(Boolean).join(' ');

			return fetchContainers(
				{
					audience: filter.audience,
					sdg: filter.sdg,
					indicatorCategory: filter.indicatorCategory,
					organization: [page.data.currentOrganization.guid],
					policyFieldBNK: filter.policyFieldBNK,
					terms: combinedTerms,
					topic: filter.topic,
					payloadType: type
				},
				sort,
				{ signal }
			);
		},
		{ lazy: true, debounce: 300 }
	);

	const searchResource = resource(
		[
			() => filter.audience,
			() => filter.sdg,
			() => filter.indicatorCategory,
			() => filter.policyFieldBNK,
			() => filter.topic,
			() => (filter.type.length > 0 ? filter.type : defaultPayloadType),
			() => sort,
			() => terms,
			() => inViewport.current
		],
		async (
			[audience, sdg, indicatorCategory, policyFieldBNK, topic, type, sort, terms],
			_,
			{ signal }
		) => {
			return fetchContainers(
				{
					audience,
					sdg,
					indicatorCategory,
					organization: [page.data.currentOrganization.guid],
					policyFieldBNK,
					terms,
					topic,
					payloadType: type
				},
				sort,
				{ signal }
			);
		},
		{
			debounce: 300,
			lazy: true
		}
	);

	const actualDataResource = resource([], async (_, __, { signal }) => {
		const response = await fetchContainers(
			{
				organization: [page.data.currentOrganization.guid],
				...(page.data.currentOrganizationalUnit
					? { organizationalUnit: [page.data.currentOrganizationalUnit.guid] }
					: undefined),
				payloadType: [payloadTypes.enum.actual_data]
			},
			'alpha',
			{ signal }
		);
		return z.array(actualDataContainer).parse(response);
	});

	let items = $derived.by(() => {
		if (container.payload.item.length > 0) {
			if (container.payload.allowSort) {
				const selectedSet = new Set(container.payload.item);
				return (savedResource.current ?? []).filter(({ guid }) => selectedSet.has(guid));
			}
			return container.payload.item
				.map((item) => savedResource.current?.find(({ guid }) => guid === item))
				.filter((item): item is AnyContainer => item !== undefined);
		} else {
			return savedResource.current ?? [];
		}
	});

	let visibleItems = $derived(items.slice(0, visibleCount));

	let hasMoreItems = $derived(items.length > visibleCount);

	let hasConfiguredContent = $derived(
		container.payload.item.length > 0 ||
			Object.values(container.payload.filter).some((v) => v.length > 0)
	);

	let isRuleBasedCollection = $derived(container.payload.item.length === 0);

	let allCatalogHref = $derived.by(() => {
		const params = new SvelteURLSearchParams();

		for (const value of container.payload.item) {
			params.append('item', value);
		}

		for (const value of container.payload.filter.audience) {
			params.append('audience', value);
		}
		for (const value of container.payload.filter.sdg) {
			params.append('sdg', value);
		}
		for (const value of container.payload.filter.policyFieldBNK) {
			params.append('policyFieldBNK', value);
		}
		for (const value of container.payload.filter.topic) {
			params.append('topic', value);
		}
		for (const value of container.payload.filter.indicatorCategory) {
			params.append('indicatorCategory', value);
		}

		for (const value of container.payload.filter.type) {
			params.append('payloadType', value);
		}

		const searchTerms = container.payload.allowSearch ? localTerms.trim() : '';
		const termsForCatalog = searchTerms || container.payload.terms.trim();
		if (termsForCatalog) {
			params.append('terms', termsForCatalog);
		}

		const queryString = params.toString();
		const path = resolve('/[guid=uuid]/all/catalog', {
			guid: page.params.guid ?? page.data.currentOrganization.guid
		});
		return `${path}${queryString ? `?${queryString}` : ''}`;
	});

	// Fetch comparison data for all indicators in batch
	let selectedMunicipalityGuids = $derived(
		$compareState.selectedMunicipalities.map((m) => m.guid) ?? []
	);

	let indicatorGuids = $derived(
		visibleItems.filter(isIndicatorTemplateContainer).map((item) => item.guid)
	);

	// Fetch comparison data for all indicators in batch if there are selected municipalities in store
	const comparisonDataResource = resource(
		() => [selectedMunicipalityGuids, indicatorGuids, inViewport.current] as const,
		async ([municipalityGuids, indicators], _, { signal }) => {
			if (municipalityGuids.length === 0 || indicators.length === 0) return [];

			// Split indicators into chunks to avoid 431 error (Request URI Too Large)
			const CHUNK_SIZE = 50; // Conservative limit to keep URL under ~8KB
			const chunks: string[][] = [];
			for (let i = 0; i < indicators.length; i += CHUNK_SIZE) {
				chunks.push(indicators.slice(i, i + CHUNK_SIZE));
			}

			// Fetch all chunks in parallel
			const fetchPromises = chunks.map(async (indicatorChunk) => {
				const params = new SvelteURLSearchParams();
				for (const guid of indicatorChunk) {
					params.append('indicator', guid);
				}
				for (const guid of municipalityGuids) {
					params.append('organizationalUnit', guid);
				}
				params.append('payloadType', payloadTypes.enum.actual_data);

				const response = await fetch(`/container?${params.toString()}`, { signal });
				if (!response.ok) return [];
				return z.array(actualDataContainer).parse(await response.json());
			});

			// Combine results from all chunks
			const results = await Promise.all(fetchPromises);
			return results.flat();
		},
		{ lazy: true }
	);

	// Create a map for efficient lookup of comparison data by indicator GUID
	let comparisonDataMap = $derived.by(() => {
		const map = new SvelteMap<string, ActualDataContainer[]>();
		for (const container of comparisonDataResource.current ?? []) {
			if (isActualDataContainer(container) && container.payload.indicator) {
				const indicatorGuid = container.payload.indicator;
				if (!map.has(indicatorGuid)) {
					map.set(indicatorGuid, []);
				}
				map.get(indicatorGuid)!.push(container);
			}
		}
		return map;
	});

	function addItems() {
		dialog?.showModal();
	}

	function resetFilters() {
		filter = {
			audience: [],
			category: [],
			sdg: [],
			indicatorCategory: [],
			type: [],
			policyFieldBNK: [],
			topic: []
		};
	}

	function handleRemoveFilterValue(key: string, value: string) {
		if (key in filter) {
			filter = { ...filter, [key]: filter[key as keyof typeof filter].filter((v) => v !== value) };
		}
	}

	$effect(() => {
		if (!container.payload.allowSearch) {
			localTerms = '';
		}
	});

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
			localSort = updatedContainer.payload.sort;
			visibleCount = MAX_ITEMS_PER_PAGE;
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

<header bind:this={header}>
	<svelte:element this={heading} class="details-heading">
		{#if editable && $ability.can('update', container)}
			<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
			<AutoresizingTextarea
				bind:value={container.payload.title}
				id={idForTitle}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
					}
				}}
				placeholder={$_('chapter.title.placeholder')}
				rows={1}
			/>
		{:else}
			{container.payload.title}
		{/if}
		{#if hasConfiguredContent}
			<span class="details-count">({items.length})</span>
		{/if}
	</svelte:element>

	<ul class="inline-actions" class:is-visible-on-hover={editable}>
		{#if hasConfiguredContent && isRuleBasedCollection}
			<li>
				<button
					class="show-all-button"
					onclick={() => (window.location.href = allCatalogHref)}
					type="button"
				>
					<ArrowRight />
					{$_('custom_collection.show_all')}
				</button>
			</li>
		{/if}

		{#if container.payload.allowSearch && hasConfiguredContent}
			<li class="inline-search-item">
				<label class="search-inline search-slot">
					<Search />
					<span class="is-visually-hidden">{$_('search')}</span>
					<input
						type="search"
						placeholder={$_('search')}
						bind:value={localTerms}
						oninput={(e) => {
							e.stopPropagation();
							visibleCount = MAX_ITEMS_PER_PAGE;
						}}
					/>
				</label>
			</li>
		{/if}

		{#if editable}
			<li>
				<CustomCollectionSettingsDropdown
					bind:container
					onAddItems={addItems}
					bind:parentContainer
					bind:relatedContainers
				/>
			</li>
		{/if}
	</ul>
</header>

{#if hasConfiguredContent}
	<div class="carousel-toolbar">
		{#if container.payload.allowSort}
			<SortDropdown options={sortOptions} bind:value={localSort} />
		{/if}
	</div>
{/if}

{#if hasConfiguredContent}
	{#if container.payload.listType === 'carousel'}
		<Carousel
			addItem={addItems}
			items={visibleItems}
			mayAddItem={editable && $ability.can('update', container)}
		>
			{#snippet itemSnippet(item)}
				{#if isIndicatorTemplateContainer(item)}
					{@const relatedContainers =
						actualDataResource.current?.filter(({ payload }) => payload.indicator === item.guid) ??
						[]}
					<NewIndicatorCard
						--height="100%"
						container={item}
						{relatedContainers}
						{comparisonDataMap}
					/>
				{:else}
					<Card --height="100%" container={item} />
				{/if}
			{/snippet}
		</Carousel>
	{:else}
		<ul class="catalog">
			{#each visibleItems as item (item.guid)}
				<li>
					{#if isIndicatorTemplateContainer(item)}
						{@const relatedContainers =
							actualDataResource.current?.filter(
								({ payload }) => payload.indicator === item.guid
							) ?? []}
						<NewIndicatorCard
							--height="100%"
							container={item}
							{relatedContainers}
							{comparisonDataMap}
						/>
					{:else}
						<Card --height="100%" container={item} />
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if hasMoreItems}
		<p class="load-more">
			<button class="button" onclick={() => (visibleCount += MAX_ITEMS_PER_PAGE)} type="button">
				{$_('load_more')}
			</button>
		</p>
	{/if}
{:else if editable}
	<div class="catalog">
		<button onclick={addItems} type="button">
			<Collection />
			{$_('custom_collection.add_items')}
		</button>
	</div>
{/if}

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
			{@const options = [...foci.entries()]
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
										{$_(value)}
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

	.details-heading {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.details-count {
		color: var(--color-gray-400);
		font-size: inherit;
		font-weight: 400;
	}

	.search-inline {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.show-all-button {
		--button-active-background: transparent;
		--button-background: var(--color-white);
		--button-hover-background: var(--color-gray-050);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		color: var(--color-gray-900);
		display: inline-flex;
		height: 2.125rem;
		font-size: 0.75rem;
		font-weight: 500;
		gap: 0.5rem;
		line-height: 1.5;
	}

	.show-all-button > :global(svg) {
		height: 0.75rem;
		max-width: none;
		width: 0.75rem;
	}

	.inline-search-item {
		display: flex;
		min-width: 10rem;
	}

	.search-slot {
		margin-top: 0;
		max-width: 12rem;
		position: relative;
		width: 100%;
	}

	.search-slot > :global(svg) {
		color: var(--color-gray-500);
		height: 1rem;
		left: 0.625rem;
		max-width: none;
		pointer-events: none;
		position: absolute;
		top: 0.5rem;
		width: 1rem;
	}

	.search-inline input {
		margin: 0;
		min-width: 10rem;
	}

	.search-slot input {
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		height: 2.125rem;
		min-width: 12rem;
		padding: 0 0.5rem;
		padding-left: 2rem;
		width: 100%;
	}

	.load-more {
		display: flex;
		justify-content: center;
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
