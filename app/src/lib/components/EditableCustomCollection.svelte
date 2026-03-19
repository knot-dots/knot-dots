<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
	import { z } from 'zod';
	import CheckCircle from '~icons/flowbite/check-circle-solid';
	import ChevronLeft from '~icons/flowbite/chevron-left-outline';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import Eye from '~icons/flowbite/eye-outline';
	import Sort from '~icons/flowbite/sort-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import ArrowRight from '~icons/knotdots/arrow-right';
	import ArrowRightBox from '~icons/knotdots/arrow-right-box';
	import CarouselIcon from '~icons/knotdots/carousel';
	import ChevronRight from '~icons/knotdots/chevron-right';
	import Close from '~icons/knotdots/close';
	import Collection from '~icons/knotdots/collection';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import Grid from '~icons/knotdots/grid';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import Plus from '~icons/knotdots/plus';
	import Search from '~icons/knotdots/search';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import deleteContainer from '$lib/client/deleteContainer';
	import fetchContainers from '$lib/client/fetchContainers';
	import saveContainer from '$lib/client/saveContainer';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
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
		topics,
		visibility
	} from '$lib/models';
	import { ability, compareState } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';

	const MAX_ITEMS_PER_PAGE = 50;

	interface Props {
		container: CustomCollectionContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	type SettingsSubview = 'main' | 'view' | 'visibility' | 'interactions';

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let dialog: HTMLDialogElement = $state(undefined!);
	let confirmDeleteDialog: HTMLDialogElement = $state(undefined!);

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });
	let sortBar = createDisclosure({ label: $_('sort') });

	let settingsPopover = createPopover({ label: $_('custom_collection.settings.title') });

	let [settingsPopperRef, settingsPopperContent] = createPopperActions({
		placement: 'bottom-end',
		strategy: 'fixed'
	});

	const settingsPopperOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 8] } }] };
	const defaultPayloadType = [
		payloadTypes.enum.indicator_template,
		payloadTypes.enum.program,
		payloadTypes.enum.goal,
		payloadTypes.enum.measure
	];

	let settingsSubview = $state<SettingsSubview>('main');

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

	let listType = $state(container.payload.listType);

	let allowSearch = $state(container.payload.allowSearch);

	let allowSort = $state(container.payload.allowSort);

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
			() => container.payload.filter.audience,
			() => container.payload.filter.sdg,
			() => container.payload.filter.indicatorCategory,
			() => container.payload.filter.policyFieldBNK,
			() => container.payload.filter.topic,
			() =>
				container.payload.filter.type.length > 0
					? container.payload.filter.type
					: defaultPayloadType,
			() => container.payload.sort,
			() => container.payload.terms,
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
		{ lazy: true }
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
			return container.payload.item
				.map((item) => savedResource.current?.find(({ guid }) => guid === item))
				.filter((item): item is AnyContainer => item !== undefined);
		} else {
			return savedResource.current ?? [];
		}
	});

	function containerLabel(item: AnyContainer) {
		if ('name' in item.payload) {
			return item.payload.name;
		}
		if ('title' in item.payload) {
			return item.payload.title;
		}
		return '';
	}

	let filteredItems = $derived.by(() => {
		const normalizedTerms = allowSearch ? localTerms.trim().toLocaleLowerCase() : '';
		const result = items.filter((item) =>
			normalizedTerms ? containerLabel(item).toLocaleLowerCase().includes(normalizedTerms) : true
		);

		if (allowSort) {
			return [...result].toSorted((a, b) => {
				if (localSort === 'modified') {
					const modifiedB = b.valid_from ? new Date(b.valid_from).getTime() : 0;
					const modifiedA = a.valid_from ? new Date(a.valid_from).getTime() : 0;
					return modifiedB - modifiedA;
				}
				return containerLabel(a).localeCompare(containerLabel(b), undefined, {
					numeric: true,
					sensitivity: 'base'
				});
			});
		}

		return result;
	});

	let visibleItems = $derived(filteredItems.slice(0, visibleCount));

	let hasMoreItems = $derived(filteredItems.length > visibleCount);

	let hasConfiguredContent = $derived(
		container.payload.item.length > 0 ||
			Object.values(container.payload.filter).some((v) => v.length > 0)
	);

	let isRuleBasedCollection = $derived(container.payload.item.length === 0);

	let interactionsSummary = $derived.by(() => {
		const interactions: string[] = [];
		if (allowSearch) {
			interactions.push($_('search'));
		}
		interactions.push($_('filter'));
		if (allowSort) {
			interactions.push($_('sort'));
		}

		return interactions.length > 0 ? interactions.join(', ') : $_('empty');
	});

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
			params.append(
				'payloadType',
				value === payloadTypes.enum.indicator_template ? payloadTypes.enum.indicator : value
			);
		}

		const searchTerms = allowSearch ? localTerms.trim() : '';
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

	async function updateCollectionSettings(
		payloadPatch: Partial<CustomCollectionContainer['payload']>
	) {
		const response = await saveContainer({
			...container,
			payload: {
				...container.payload,
				...payloadPatch
			}
		});

		if (response.ok) {
			const updatedContainer = await response.json();
			container.payload = updatedContainer.payload;
			container.revision = updatedContainer.revision;
			listType = updatedContainer.payload.listType;
			allowSearch = updatedContainer.payload.allowSearch;
			allowSort = updatedContainer.payload.allowSort;
			localSort = updatedContainer.payload.sort;
		} else {
			const error = await response.json();
			alert(error.message);
		}
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

	async function setVisibilityOption(value: (typeof visibility.options)[number]) {
		if (container.payload.visibility === value) {
			return;
		}
		await updateCollectionSettings({ visibility: value });
	}

	async function toggleAllowSearch() {
		await updateCollectionSettings({ allowSearch: !allowSearch });
	}

	async function toggleAllowSort() {
		await updateCollectionSettings({ allowSort: !allowSort });
	}

	function openSettingsSubview(view: SettingsSubview) {
		settingsSubview = view;
	}

	function closeSettingsPopover() {
		settingsSubview = 'main';
		settingsPopover.close();
	}

	function backToSettingsMain() {
		settingsSubview = 'main';
	}

	function toggleInlineSort() {
		if (!allowSort) {
			return;
		}

		localSort = localSort === 'alpha' ? 'modified' : 'alpha';
		visibleCount = MAX_ITEMS_PER_PAGE;
	}

	async function handleDelete() {
		const response = await deleteContainer(container);

		if (response.ok) {
			parentContainer.relation = parentContainer.relation.filter(
				({ subject }) => subject !== container.guid
			);
			relatedContainers = relatedContainers.filter(({ guid }) => guid !== container.guid);
		}

		confirmDeleteDialog.close();
	}

	$effect(() => {
		if (!allowSearch) {
			localTerms = '';
		}

		if (!$settingsPopover.expanded) {
			settingsSubview = 'main';
		}
	});

	async function confirm() {
		const response = await saveContainer({
			...container,
			payload: {
				...container.payload,
				allowSearch,
				allowSort,
				filter,
				item: mode == 'select' ? selected : [],
				listType,
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
			<span class="details-count">({filteredItems.length})</span>
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

		{#if allowSearch && hasConfiguredContent}
			<li class="inline-search-item">
				<label class="search-inline search-slot">
					<Search />
					<span class="is-visually-hidden">{$_('search')}</span>
					<input
						type="search"
						placeholder={$_('search')}
						bind:value={localTerms}
						oninput={() => {
							visibleCount = MAX_ITEMS_PER_PAGE;
						}}
					/>
				</label>
			</li>
		{/if}

		{#if editable && allowSort && hasConfiguredContent}
			<li>
				<button
					class="action-button action-button--size-l"
					class:is-active={localSort === 'modified'}
					onclick={toggleInlineSort}
					title={$_('sort')}
					type="button"
				>
					<Sort />
					<span class="is-visually-hidden">{$_('sort')}</span>
				</button>
			</li>
		{/if}

		{#if editable}
			<li>
				<button class="action-button action-button--size-l" onclick={addItems} type="button">
					<Plus />
					<span class="is-visually-hidden">{$_('custom_collection.add_items')}</span>
				</button>
			</li>
			<li>
				<div class="dropdown custom-settings" use:settingsPopperRef>
					<button class="dropdown-button" type="button" use:settingsPopover.button>
						<Ellipsis />
						<span class="is-visually-hidden">{$_('custom_collection.settings.title')}</span>
					</button>

					{#if $settingsPopover.expanded}
						<fieldset
							class="dropdown-panel custom-settings-panel"
							use:settingsPopperContent={settingsPopperOpts}
							use:settingsPopover.panel
						>
							<div class="custom-settings-header">
								{#if settingsSubview !== 'main'}
									<button class="action-button" onclick={backToSettingsMain} type="button">
										<ChevronLeft />
										<span class="is-visually-hidden">{$_('back')}</span>
									</button>
								{/if}
								<p>
									{#if settingsSubview === 'main'}
										{$_('container_settings_dropdown.title')}
									{:else if settingsSubview === 'view'}
										{$_('custom_collection.settings.view')}
									{:else if settingsSubview === 'visibility'}
										{$_('container_settings_dropdown.visibility.title')}
									{:else}
										{$_('custom_collection.settings.interactions')}
									{/if}
								</p>
								<button class="action-button" onclick={closeSettingsPopover} type="button">
									<Close />
									<span class="is-visually-hidden">{$_('close')}</span>
								</button>
							</div>

							{#if settingsSubview === 'main'}
								<button
									class="custom-settings-item"
									onclick={() => openSettingsSubview('view')}
									type="button"
								>
									<CarouselIcon />
									<span>
										<strong>{$_('custom_collection.settings.view')}</strong>
										<small>{$_(`list_type.${listType}`)}</small>
									</span>
									<ChevronRight />
								</button>

								{#if $ability.can('update', container, 'visibility')}
									<button
										class="custom-settings-item"
										onclick={() => openSettingsSubview('visibility')}
										type="button"
									>
										<Eye />
										<span>
											<strong>{$_('container_settings_dropdown.visibility.title')}</strong>
											<small>{$_(`visibility.${container.payload.visibility}`)}</small>
										</span>
										<ChevronRight />
									</button>
								{/if}

								<button
									class="custom-settings-item"
									onclick={() => openSettingsSubview('interactions')}
									type="button"
								>
									<ArrowRightBox />
									<span>
										<strong>{$_('custom_collection.settings.interactions')}</strong>
										<small>{interactionsSummary}</small>
									</span>
									<ChevronRight />
								</button>

								<div class="custom-settings-divider" role="presentation"></div>
								<div class="custom-settings-section-title">
									{$_('custom_collection.settings.objects_title')}
								</div>
								<button
									class="custom-settings-embed"
									onclick={() => {
										closeSettingsPopover();
										addItems();
									}}
									type="button"
								>
									{$_('custom_collection.settings.embed_objects')}
								</button>

								<div class="custom-settings-divider" role="presentation"></div>

								{#if $ability.can('delete', container)}
									<button
										class="custom-settings-item custom-settings-item--danger"
										onclick={() => {
											closeSettingsPopover();
											confirmDeleteDialog.showModal();
										}}
										type="button"
									>
										<TrashBin />
										<span>
											<strong>{$_('container_settings_dropdown.delete.title')}</strong>
										</span>
									</button>
								{/if}
							{:else if settingsSubview === 'view'}
								<button
									class="custom-settings-choice"
									class:is-selected={listType === 'wall'}
									onclick={() => updateCollectionSettings({ listType: 'wall' })}
									type="button"
								>
									<Grid />
									<span>{$_('list_type.wall')}</span>
								</button>
								<button
									class="custom-settings-choice"
									class:is-selected={listType === 'carousel'}
									onclick={() => updateCollectionSettings({ listType: 'carousel' })}
									type="button"
								>
									<CarouselIcon />
									<span>{$_('list_type.carousel')}</span>
								</button>
							{:else if settingsSubview === 'visibility'}
								{#each visibility.options as option (option)}
									<button
										class="custom-settings-visibility"
										class:is-selected={container.payload.visibility === option}
										onclick={() => setVisibilityOption(option)}
										type="button"
									>
										<span class="custom-settings-radio" aria-hidden="true"></span>
										<span class="custom-settings-badge">{$_(`visibility.${option}`)}</span>
									</button>
								{/each}
							{:else}
								<button class="custom-settings-toggle" onclick={toggleAllowSearch} type="button">
									<span class="custom-settings-check" class:is-selected={allowSearch}></span>
									<Search />
									<span>{$_('search')}</span>
								</button>
								<button class="custom-settings-toggle" onclick={toggleAllowSort} type="button">
									<span class="custom-settings-check" class:is-selected={allowSort}></span>
									<Sort />
									<span>{$_('sort')}</span>
								</button>
							{/if}
						</fieldset>
					{/if}
				</div>
			</li>
		{/if}
	</ul>
</header>

{#if hasConfiguredContent}
	{#if listType === 'carousel'}
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

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	{container}
	handleSubmit={handleDelete}
	{relatedContainers}
/>

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
		align-items: center;
		gap: 0.5rem;
	}

	.details-count {
		color: var(--color-gray-400);
		font-size: 1rem;
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

	.action-button.is-active {
		--button-background: var(--color-primary-100);
		--button-hover-background: var(--color-primary-100);
		--button-active-background: var(--color-primary-300);
		color: var(--color-primary-700);
	}

	.custom-settings {
		--dropdown-button-default-background: transparent;
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-padding: 0.375rem;
		--dropdown-button-border-radius: 8px;
		--dropdown-button-icon-default-color: var(--color-gray-500);
		--dropdown-button-icon-expanded-color: var(--color-primary-700);
		--dropdown-button-chevron-display: none;
	}

	.custom-settings-panel {
		background-color: var(--color-gray-050);
		border: 1px solid var(--color-gray-200);
		border-radius: 1rem;
		gap: 0;
		min-width: 17.5rem;
		padding: 0.5rem;
	}

	.custom-settings-header {
		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0.5rem 0.5rem;
	}

	.custom-settings-header p {
		color: var(--color-gray-700);
		font-size: 0.75rem;
		font-weight: 600;
		margin: 0;
	}

	.custom-settings-header .action-button {
		--button-active-background: transparent;
		--button-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0.25rem;
		--padding-y: 0.25rem;

		border: none;
	}

	.custom-settings-header .action-button > :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.custom-settings-item {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: var(--color-gray-700);
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: left;
		width: 100%;
	}

	.custom-settings-item:hover {
		background-color: var(--color-gray-100);
	}

	.custom-settings-item > :global(svg:first-child) {
		color: var(--color-primary-700);
		height: 1rem;
		max-width: none;
		width: 1rem;
	}

	.custom-settings-item > span {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.custom-settings-item strong {
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1;
	}

	.custom-settings-item small {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.custom-settings-item > :global(svg:last-child) {
		color: var(--color-gray-400);
		height: 0.75rem;
		margin-left: auto;
		width: 0.75rem;
	}

	.custom-settings-choice,
	.custom-settings-visibility,
	.custom-settings-toggle {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: var(--color-gray-700);
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: left;
		width: 100%;
	}

	.custom-settings-choice:hover,
	.custom-settings-visibility:hover,
	.custom-settings-toggle:hover {
		background-color: var(--color-gray-100);
	}

	.custom-settings-choice > :global(svg),
	.custom-settings-toggle > :global(svg) {
		color: var(--color-primary-700);
		height: 1rem;
		width: 1rem;
	}

	.custom-settings-choice.is-selected,
	.custom-settings-visibility.is-selected {
		background-color: var(--color-gray-100);
	}

	.custom-settings-radio {
		border: 1px solid var(--color-gray-300);
		border-radius: 999px;
		height: 1rem;
		width: 1rem;
	}

	.custom-settings-visibility.is-selected .custom-settings-radio {
		border-color: var(--color-primary-700);
		box-shadow:
			inset 0 0 0 3px var(--color-white),
			inset 0 0 0 7px var(--color-primary-700);
	}

	.custom-settings-badge {
		background-color: var(--color-primary-100);
		border-radius: 999px;
		color: var(--color-primary-700);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
	}

	.custom-settings-check {
		border: 1px solid var(--color-gray-300);
		border-radius: 0.25rem;
		height: 1rem;
		width: 1rem;
	}

	.custom-settings-check.is-selected {
		background-color: var(--color-primary-700);
		border-color: var(--color-primary-700);
	}

	.custom-settings-divider {
		border-top: solid 1px var(--color-gray-200);
		margin: 0.375rem 0;
	}

	.custom-settings-section-title {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem 0.375rem;
	}

	.custom-settings-embed {
		--button-background: var(--color-white);
		--button-hover-background: var(--color-gray-100);
		--button-active-background: var(--color-gray-200);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		border: 1px solid var(--color-gray-200);
		color: var(--color-gray-900);
		font-weight: 500;
		justify-content: center;
		width: 100%;
	}

	.custom-settings-item--danger > :global(svg:first-child),
	.custom-settings-item--danger strong {
		color: var(--color-gray-700);
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
