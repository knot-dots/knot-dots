<script lang="ts">
	import { resource } from 'runed';
	import type { Attachment } from 'svelte/attachments';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import Sort from '~icons/flowbite/sort-outline';
	import CheckCircle from '~icons/flowbite/check-circle-solid';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import Close from '~icons/knotdots/close';
	import Collection from '~icons/knotdots/collection';
	import Filter from '~icons/knotdots/filter';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import { page } from '$app/state';
	import saveContainer from '$lib/client/saveContainer';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Card from '$lib/components/Card.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import {
		actualDataContainer,
		anyContainer,
		type AnyContainer,
		audience,
		computeFacetCount,
		type CustomCollectionContainer,
		indicatorCategories,
		isIndicatorTemplateContainer,
		payloadTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';

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

	let dialog: HTMLDialogElement;

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });

	let sortBar = createDisclosure({ label: $_('sort') });

	let defaultPayloadType = [
		payloadTypes.enum.indicator_template,
		payloadTypes.enum.program,
		payloadTypes.enum.goal,
		payloadTypes.enum.measure
	];

	let facets = $derived.by(() => {
		const facets = new Map([
			['type', new Map(defaultPayloadType.map((v) => [v as string, 0]))],
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['audience', new Map(audience.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, searchResource.current ?? []);
	});

	let filter = $state(container.payload.filter);

	let sort = $state(container.payload.sort);

	let terms = $state(container.payload.terms);

	let selected = $state(container.payload.item);

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0)
	);

	// svelte-ignore state_referenced_locally
	let mode: 'select' | 'apply_rule' = $state(
		selected.length > 0 || activeFilters == 0 ? 'select' : 'apply_rule'
	);

	const idForTitle = crypto.randomUUID();

	const savedResource = resource(
		[
			() => container.payload.filter.audience,
			() => container.payload.filter.category,
			() => container.payload.filter.indicatorCategory,
			() => container.payload.filter.policyFieldBNK,
			() => container.payload.filter.topic,
			() =>
				container.payload.filter.type.length > 0
					? container.payload.filter.type
					: defaultPayloadType,
			() => container.payload.sort,
			() => container.payload.terms
		],
		async (
			[audience, category, indicatorCategory, policyFieldBNK, topic, type, sort, terms],
			_,
			{ signal }
		) => {
			const params = new URLSearchParams([
				...audience.map((v) => ['audience', v]),
				...category.map((v) => ['category', v]),
				...indicatorCategory.map((v) => ['indicatorCategory', v]),
				['organization', page.data.currentOrganization.guid],
				...policyFieldBNK.map((v) => ['policyFieldBNK', v]),
				['terms', terms],
				...topic.map((v) => ['topic', v]),
				...type.map((v) => ['payloadType', v]),
				['sort', sort]
			]);

			const response = await fetch(`/container?${params.toString()}`, { signal });
			return z.array(anyContainer).parse(await response.json());
		}
	);

	const searchResource = resource(
		[
			() => filter.audience,
			() => filter.category,
			() => filter.indicatorCategory,
			() => filter.policyFieldBNK,
			() => filter.topic,
			() => (filter.type.length > 0 ? filter.type : defaultPayloadType),
			() => sort,
			() => terms
		],
		async (
			[audience, category, indicatorCategory, policyFieldBNK, topic, type, sort, terms],
			_,
			{ signal }
		) => {
			const params = new URLSearchParams([
				...audience.map((v) => ['audience', v]),
				...category.map((v) => ['category', v]),
				...indicatorCategory.map((v) => ['indicatorCategory', v]),
				['organization', page.data.currentOrganization.guid],
				...policyFieldBNK.map((v) => ['policyFieldBNK', v]),
				['terms', terms],
				...topic.map((v) => ['topic', v]),
				...type.map((v) => ['payloadType', v]),
				['sort', sort]
			]);

			const response = await fetch(`/container?${params.toString()}`, { signal });
			return z.array(anyContainer).parse(await response.json());
		},
		{
			debounce: 300
		}
	);

	const actualDataResource = resource([], async (_, __, { signal }) => {
		const params = new URLSearchParams([
			['organization', page.data.currentOrganization.guid],
			...(page.data.currentOrganizationalUnit
				? [['organizationalUnit', page.data.currentOrganizationalUnit.guid]]
				: []),
			['payloadType', payloadTypes.enum.actual_data],
			['sort', 'alpha']
		]);

		const response = await fetch(`/container?${params.toString()}`, { signal });
		return z.array(actualDataContainer).parse(await response.json());
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

	function addItems() {
		dialog.showModal();
	}

	function resetFilters() {
		filter = {
			audience: [],
			category: [],
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

	async function confirm() {
		const response = await saveContainer({
			...container,
			payload: { ...container.payload, filter, item: mode == 'select' ? selected : [], sort, terms }
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

	const init: Attachment = (element) => {
		if (container.payload.title == '') {
			(element as HTMLElement).focus();
		}
	};
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{#if editable && $ability.can('update', container)}
			<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
			<AutoresizingTextarea
				{@attach init}
				bind:value={container.payload.title}
				id={idForTitle}
				placeholder={$_('chapter.title.placeholder')}
				rows={1}
			/>
		{:else}
			{container.payload.title}
		{/if}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<button class="action-button action-button--size-l" onclick={addItems} type="button">
					<Collection />
					<span class="is-visually-hidden">{$_('custom_collection.add_items')}</span>
				</button>
			</li>
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if container.payload.item.length > 0 || Object.values(container.payload.filter).some((v) => v.length > 0)}
	<ul class="catalog">
		{#each items as item (item.guid)}
			<li>
				{#if isIndicatorTemplateContainer(item)}
					{@const relatedContainers =
						actualDataResource.current?.filter(({ payload }) => payload.indicator === item.guid) ??
						[]}
					<NewIndicatorCard --height="100%" container={item} {relatedContainers} />
				{:else}
					<Card --height="100%" container={item} />
				{/if}
			</li>
		{/each}
	</ul>
{:else if editable}
	<div class="catalog">
		<button onclick={addItems} type="button">
			<Collection />
			{$_('custom_collection.add_items')}
		</button>
	</div>
{/if}

<dialog bind:this={dialog} oninput={(e) => e.stopPropagation()}>
	<form method="dialog">
		<div class="commands">
			<span>{$_('custom_collection.dialog.title')}</span>

			<SearchInput bind:value={terms} />

			<button
				class="dropdown-button dropdown-button--command"
				onclick={() => sortBar.close()}
				type="button"
				use:filterBar.button
			>
				<Filter />
				<span class="is-visually-hidden is-visually-hidden--mobile-only">{$_('filter')}</span>
				{#if activeFilters > 0 && !$filterBar.expanded}
					<span class="indicator">{activeFilters}</span>
				{/if}
			</button>

			<button
				class="dropdown-button dropdown-button--command"
				onclick={() => filterBar.close()}
				type="button"
				use:sortBar.button
			>
				<Sort />
				<span class="is-visually-hidden">{$_('sort')}</span>
			</button>
		</div>

		<div class="filter-and-sort">
			{#if $filterBar.expanded}
				<fieldset use:filterBar.panel>
					{#if activeFilters > 0}
						<span class="active-filters">
							{$_('active_filters', { values: { count: activeFilters } })}
						</span>

						<button class="button-outline button-xs" onclick={resetFilters} type="button">
							<Close />
						</button>
					{/if}

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
				</fieldset>
			{:else if $sortBar.expanded}
				{@const sortOptions = [
					[$_('sort_alphabetically'), 'alpha'],
					[$_('sort_modified'), 'modified']
				]}
				<fieldset aria-labelledby="legend" use:sortBar.panel>
					<legend class="is-visually-hidden">{$_('sort')}</legend>
					<span aria-hidden="true">{$_('sort')}</span>
					{#each sortOptions as [label, value]}
						{@const Icon = sortIcons.get(value)}
						<label class="sort-option">
							<input type="radio" {value} bind:group={sort} />
							<Icon />
							{label}
						</label>
					{/each}
				</fieldset>
			{/if}
		</div>

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
								<SelectableCard
									--height="100%"
									bind:value={selected}
									container={item}
									selectable={mode === 'select'}
								/>
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
	</form>
</dialog>

<style>
	dialog {
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-chevron-icon-size: 1rem;

		--icon-color: var(--color-gray-500);
		--indicator-background-color: var(--color-primary-700);

		background-color: var(--color-gray-025);
		border: solid 1px var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-2xl);
		color: var(--color-gray-500);
		container-type: inline-size;
		height: calc(100vh - 3rem);
		padding: 1.5rem;
		width: calc(100vw - 10rem);
	}

	dialog > form {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.commands {
		align-items: center;
		display: flex;
		flex-direction: row;
		flex-shrink: 0;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.commands > span {
		margin-right: auto;
	}

	.commands > :global(*) {
		width: fit-content;
	}

	.dropdown-button.dropdown-button--command {
		--dropdown-button-default-background: transparent;
		--dropdown-button-padding: 0 0.5rem 0 0.375rem;

		height: 2rem;
		position: relative;
	}

	.filter-and-sort > fieldset {
		align-items: center;
		background-color: var(--color-primary-050);
		border: solid 1px var(--color-primary-200);
		border-radius: calc(infinity * 1px);
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
		height: 3.125rem;
		margin-left: auto;
		padding: 0.5rem 1rem;
		width: fit-content;
	}

	.active-filters {
		color: var(--dropdown-button-expanded-color);
	}

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

	.inline-actions {
		margin-left: 0;
		margin-top: 1rem;
	}

	.inline-actions > li:last-child {
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
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		margin-top: 1rem;
		overflow: auto;
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

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden.is-visually-hidden--mobile-only {
				all: revert-layer;
			}
		}
	}
</style>
