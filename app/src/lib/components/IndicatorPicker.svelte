<script lang="ts">
	import { resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import Sort from '~icons/flowbite/sort-outline';
	import Close from '~icons/knotdots/close';
	import Filter from '~icons/knotdots/filter';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import {
		computeFacetCount,
		indicatorCategories,
		indicatorTemplateContainer,
		indicatorTypes,
		payloadTypes,
		sustainableDevelopmentGoals
	} from '$lib/models';
	import { sortIcons } from '$lib/theme/models';
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });

	let sortBar = createDisclosure({ label: $_('sort') });

	let filter = $state({
		sdg: [],
		indicatorCategory: [indicatorCategories.enum['indicator_category.wegweiser_kommune']],
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
		[
			() => filter.sdg,
			() => filter.indicatorCategory,
			() => filter.indicatorType,
			() => sort,
			() => terms
		],
		async ([sdg, indicatorCategory, indicatorType, sort, terms], _, { signal }) => {
			const params = new URLSearchParams([
				...sdg.map((v) => ['sdg', v]),
				...indicatorCategory.map((v) => ['indicatorCategory', v]),
				...indicatorType.map((v) => ['indicatorType', v]),
				['payloadType', payloadTypes.enum.indicator_template],
				['sort', sort],
				['terms', terms]
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
			['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['indicatorTypes', new Map(indicatorTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, searchResource.current ?? []);
	});

	function resetFilters() {
		filter = {
			sdg: [],
			indicatorCategory: [],
			indicatorType: []
		};
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
</script>

<dialog bind:this={dialog} oninput={(e) => e.stopPropagation()}>
	<form method="dialog">
		<div class="commands">
			<span>{$_('indicator_picker.title')}</span>

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
								bind:value={selected}
								container={item}
								selectable={mode === 'select'}
							/>
						</li>
					{/each}
				</ul>
			{/if}
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

	.result {
		display: flex;
		flex-direction: column;
		min-height: 1px;
	}

	.result .inline-actions {
		align-items: center;
		margin-left: 0;
		margin-top: 1rem;
	}

	.result .inline-actions label {
		padding: 0.625rem 1.25rem;
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
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		margin-top: 1rem;
		overflow: auto;
	}
</style>
