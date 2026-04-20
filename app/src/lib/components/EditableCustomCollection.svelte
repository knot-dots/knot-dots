<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import ArrowRight from '~icons/knotdots/arrow-right';
	import Collection from '~icons/knotdots/collection';
	import Search from '~icons/knotdots/search';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import fetchContainers from '$lib/client/fetchContainers';
	import CustomCollectionPicker from '$lib/components/CustomCollectionPicker.svelte';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import CustomCollectionSettingsDropdown from '$lib/components/CustomCollectionSettingsDropdown.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import SortDropdown from '$lib/components/SortDropdown.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type ActualDataContainer,
		actualDataContainer,
		type AnyContainer,
		type CustomCollectionContainer,
		isActualDataContainer,
		isIndicatorTemplateContainer,
		isOrganizationalUnitContainer,
		payloadTypes
	} from '$lib/models';
	import { ability, compareState } from '$lib/stores';

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

	const defaultPayloadType = $derived([
		payloadTypes.enum.goal,
		payloadTypes.enum.help,
		payloadTypes.enum.indicator_template,
		payloadTypes.enum.knowledge,
		payloadTypes.enum.measure,
		payloadTypes.enum.organizational_unit,
		...(createFeatureDecisions(page.data.features).useReport() ? [payloadTypes.enum.report] : []),
		payloadTypes.enum.program,
		...(createFeatureDecisions(page.data.features).useReport() ? [payloadTypes.enum.report] : []),
		payloadTypes.enum.task
	]);

	let localTerms = $state('');

	let localSort = $derived(container.payload.sort);

	let visibleCount = $state(MAX_ITEMS_PER_PAGE);

	const idForTitle = crypto.randomUUID();

	let header = $state<HTMLElement>();

	const inViewport = new IsInViewport(() => header);

	let inViewportOnce = $state(false);

	$effect(() => {
		if (inViewport.current) {
			inViewportOnce = true;
		}
	});

	const savedResource = resource(
		[
			() => container.payload.item,
			() => $state.snapshot(container.payload.filter),
			() => container.payload.terms,
			() => (container.payload.allowSearch ? localTerms.trim() : ''),
			() => (container.payload.allowSort ? localSort : container.payload.sort),
			() => inViewportOnce
		],
		async ([item, filter, terms, searchTerms, sort], _, { signal }) => {
			const type = filter.type && filter.type.length > 0 ? filter.type : defaultPayloadType;
			const combinedTerms = [terms.trim(), searchTerms].filter(Boolean).join(' ');

			const activeFilters = Object.values(filter).reduce(
				(acc, v) => acc + (v.length > 0 ? 1 : 0),
				0
			);

			return item.length > 0 || activeFilters > 0
				? fetchContainers(
						{
							...(item.length > 0
								? { guid: item, terms: combinedTerms }
								: {
										...filter,
										organization: [page.data.currentOrganization.guid],
										payloadType: type,
										terms: combinedTerms
									})
						},
						sort,
						{ signal }
					)
				: [];
		},
		{ lazy: true, debounce: 300 }
	);

	const actualDataResource = resource([], async (_, __, { signal }) => {
		const response = await fetchContainers(
			{
				organization: [page.data.currentOrganization.guid],
				organizationalUnit: page.data.currentOrganizationalUnit
					? [page.data.currentOrganizationalUnit.guid]
					: [''],
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
		const params = new URLSearchParams();

		for (const value of container.payload.item) {
			params.append('guid', value);
		}

		for (const key in container.payload.filter) {
			for (const value of container.payload.filter[key]) {
				params.append(key, value);
			}
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

	$effect(() => {
		if (!container.payload.allowSearch) {
			localTerms = '';
		}
	});
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
				<a class="button button-xs" href={allCatalogHref}>
					<ArrowRight />
					{$_('custom_collection.show_all')}
				</a>
			</li>
		{/if}

		{#if container.payload.allowSearch && hasConfiguredContent}
			<li class="inline-actions-search">
				<label class="focus-indicator">
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

{#if hasConfiguredContent && container.payload.allowSort}
	<div class="carousel-toolbar">
		<SortDropdown options={sortOptions} bind:value={localSort} />
	</div>
{/if}

{#if hasConfiguredContent}
	{#if container.payload.listType === 'carousel'}
		<Carousel
			addItem={addItems}
			items={visibleItems}
			mayAddItem={editable && $ability.can('update', container)}
			onLoadMore={hasMoreItems ? () => (visibleCount += MAX_ITEMS_PER_PAGE) : undefined}
		>
			{#snippet itemSnippet(item)}
				{#if isIndicatorTemplateContainer(item)}
					{@const relatedContainers =
						actualDataResource.current?.filter(({ payload }) => payload.indicator === item.guid) ??
						[]}
					<NewIndicatorCard container={item} {relatedContainers} {comparisonDataMap} />
				{:else if isOrganizationalUnitContainer(item)}
					<OrganizationCard container={item} />
				{:else}
					<Card container={item} />
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
					{:else if isOrganizationalUnitContainer(item)}
						<OrganizationCard --height="100%" container={item} />
					{:else}
						<Card --height="100%" container={item} />
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if hasMoreItems && container.payload.listType !== 'carousel'}
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

<CustomCollectionPicker bind:container bind:dialog />

<style>
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

	.inline-actions-search {
		display: flex;
		min-width: 10rem;
	}

	.inline-actions-search label {
		align-items: center;
		background-color: var(--color-gray-050);
		border-radius: 6px;
		display: flex;
		padding-left: 0.5rem;
	}

	.inline-actions-search label:hover,
	.inline-actions-search label:focus-within {
		background-color: var(--color-gray-100);
	}

	.inline-actions-search input {
		background-color: transparent;
		border: none;
		display: inline-block;
		flex-grow: 0;
		height: 2rem;
		padding: 0 0.5rem;
	}

	.inline-actions-search input:focus {
		outline: none;
	}

	.load-more {
		display: flex;
		justify-content: center;
		margin-top: 1rem;
	}
</style>
