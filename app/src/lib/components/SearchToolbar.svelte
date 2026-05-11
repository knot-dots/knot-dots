<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Sort from '~icons/flowbite/sort-outline';
	import Close from '~icons/knotdots/close';
	import Filter from '~icons/knotdots/filter';
	import type { CategoryContext } from '$lib/categoryOptions';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import { sortIcons } from '$lib/theme/models';

	interface Props {
		categoryContext: CategoryContext;
		extraPrimaryContent?: Snippet;
		facets: Map<string, Map<string, number>>;
		filter: Record<string, string[]>;
		sort?: string;
		sortOptions?: [string, string][];
		terms: string;
	}

	let {
		categoryContext,
		extraPrimaryContent,
		facets,
		filter = $bindable(),
		sort = $bindable(),
		sortOptions = [],
		terms = $bindable()
	}: Props = $props();

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0)
	);

	function onResetFilters() {
		Object.keys(filter).forEach((key) => (filter[key] = []));
	}

	const filterBar = createDisclosure({ label: $_('filters'), expanded: true });

	const sortBar = createDisclosure({ label: $_('sort'), expanded: false });

	const mode = 'select';
</script>

<div class="search-toolbar">
	<span>{@render extraPrimaryContent?.()}</span>

	<SearchInput bind:value={terms} />

	<button
		class="dropdown-button"
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

	{#if sortOptions.length > 0}
		<button
			class="dropdown-button"
			onclick={() => filterBar.close()}
			type="button"
			use:sortBar.button
		>
			<Sort />
			<span class="is-visually-hidden">{$_('sort')}</span>
		</button>
	{/if}
</div>

<div class="search-toolbar-secondary">
	{#if $filterBar.expanded}
		<fieldset use:filterBar.panel>
			{#if activeFilters > 0}
				<span class="active-filters">
					{$_('active_filters', { values: { count: activeFilters } })}
				</span>

				<button class="button-outline button-xs" onclick={onResetFilters} type="button">
					<Close />
				</button>
			{/if}

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
		</fieldset>
	{:else if $sortBar.expanded}
		<fieldset use:sortBar.panel>
			<span aria-hidden="true">{$_('sort')}</span>
			{#each sortOptions as [label, value] (value)}
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

<style>
	.search-toolbar {
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-chevron-icon-size: 1rem;

		--icon-color: var(--color-gray-500);
		--indicator-background-color: var(--color-primary-700);

		align-items: center;
		display: flex;
		flex-direction: row;
		flex-shrink: 0;
		font-size: 0.875rem;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.search-toolbar > span {
		margin-right: auto;
	}

	.search-toolbar > :global(*) {
		width: fit-content;
	}

	.dropdown-button {
		--dropdown-button-default-background: transparent;
		--dropdown-button-padding: 0 0.5rem 0 0.375rem;

		height: 2rem;
		position: relative;
	}

	.search-toolbar-secondary {
		--indicator-background-color: var(--color-primary-700);
	}

	.search-toolbar-secondary > fieldset {
		align-items: center;
		background-color: var(--color-primary-050);
		border: solid 1px var(--color-primary-200);
		border-radius: calc(infinity * 1px);
		display: flex;
		flex-direction: row;
		font-size: 0.875rem;
		gap: 0.5rem;
		height: 3.125rem;
		margin-left: auto;
		padding: 0.5rem 1rem;
		width: fit-content;
	}

	.active-filters {
		color: var(--dropdown-button-expanded-color);
	}

	.indicator {
		position: absolute;
		right: -0.375rem;
		top: -0.375rem;
	}

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden.is-visually-hidden--mobile-only {
				all: revert-layer;
			}
		}
	}
</style>
