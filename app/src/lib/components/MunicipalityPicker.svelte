<script lang="ts">
	import { resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import { administrativeTypes, payloadTypes, type OrganizationalUnitContainer } from '$lib/models';
	import { untrack } from 'svelte';

	interface Props {
		dialog: HTMLDialogElement;
		selected: OrganizationalUnitContainer[];
	}

	let { dialog = $bindable(), selected = $bindable() }: Props = $props();

	let filterBar = createDisclosure({ label: $_('filters'), expanded: false });
	let sortBar = createDisclosure({ label: $_('sort'), expanded: false });

	let terms = $state('');
	let localSelected: string[] = $state([]);

	const PAGE_SIZE = 50;
	let offset = $state(0);
	let allMunicipalities: OrganizationalUnitContainer[] = $state([]);
	let hasMore = $state(true);
	let isLoadingMore = $state(false);
	let previousResults: OrganizationalUnitContainer[] | undefined = $state(undefined);
	let loadMoreSentinel: HTMLElement | undefined = $state(undefined);

	// Maintain a map of all encountered municipalities to preserve selections
	// even if they are no longer in the current visible list (e.g. after search)
	let knownMunicipalities = new SvelteMap<string, OrganizationalUnitContainer>();

	// Fetch municipalities based on search terms
	const municipalitiesResource = resource(
		() => [terms, offset] as const,
		async ([terms, offset], _, { signal }) => {
			const params = new SvelteURLSearchParams();
			params.append('organization', page.data.currentOrganization.guid);
			params.append('payloadType', payloadTypes.enum.organizational_unit);

			for (const type of administrativeTypes.options) {
				params.append('administrativeType', type);
			}

			if (terms) {
				params.append('terms', terms);
			}

			// Append pagination parameters
			params.append('limit', String(PAGE_SIZE));
			params.append('offset', String(offset));

			params.append('sort', 'alpha');

			const response = await fetch(`/container?${params.toString()}`, { signal });
			if (!response.ok) throw new Error(response.statusText);
			const result = await response.json();
			return result as OrganizationalUnitContainer[];
		},
		{ debounce: 300 }
	);

	// When search results change, update the list
	$effect(() => {
		const results = municipalitiesResource.current;
		if (results && results !== previousResults) {
			previousResults = results;
			if (untrack(() => offset === 0)) {
				// First load or search - replace results
				allMunicipalities = results;
			} else {
				// Loading more - append results
				allMunicipalities = [...allMunicipalities, ...results];
			}

			// Add to known municipalities
			for (const m of results) {
				knownMunicipalities.set(m.guid, m);
			}

			// Check if there might be more results
			// If we got less than PAGE_SIZE, we're at the end
			hasMore = results.length === PAGE_SIZE;
			isLoadingMore = false;
		}
	});

	// Reset pagination when search terms change
	let previousTerms = $state('');
	$effect.pre(() => {
		if (terms !== previousTerms) {
			offset = 0;
			hasMore = true;
			isLoadingMore = false;
			previousTerms = terms;
			previousResults = undefined;
			allMunicipalities = [];
		}
	});

	async function loadMore() {
		if (isLoadingMore || !hasMore) return;
		isLoadingMore = true;
		offset += PAGE_SIZE;
	}

	let activeFilters = $derived(0);

	function resetFilters() {
		// No filters for now, could add administrative type filters later
	}

	function clearSelection() {
		localSelected = [];
	}

	function cancel() {
		dialog.close();
	}

	function confirm() {
		selected = localSelected
			.map((guid) => knownMunicipalities.get(guid))
			.filter((m): m is OrganizationalUnitContainer => !!m);
		dialog.close();
	}

	// Initialize local selection from parent and track their objects
	$effect(() => {
		if (dialog && selected) {
			localSelected = selected.map((s) => s.guid);
			for (const s of selected) {
				knownMunicipalities.set(s.guid, s);
			}
		}
	});

	// Infinite scroll: observe sentinel element to load more data
	$effect(() => {
		if (!loadMoreSentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				// Check conditions at the time of intersection, not at effect setup time.
				// We also check allMunicipalities.length > 0 to ensure we don't skip the first page.
				if (
					entries[0].isIntersecting &&
					hasMore &&
					!isLoadingMore &&
					!terms &&
					allMunicipalities.length > 0
				) {
					loadMore();
				}
			},
			{
				threshold: 0,
				rootMargin: '200px'
			}
		);

		observer.observe(loadMoreSentinel);

		return () => {
			observer.disconnect();
		};
	});
</script>

<PickerDialog
	bind:dialog
	bind:terms
	{activeFilters}
	{filterBar}
	{sortBar}
	onResetFilters={resetFilters}
	title={$_('compare_search_municipality')}
>
	{#snippet filterContent()}
		<!-- No filters for now -->
	{/snippet}

	{#snippet sortContent()}
		<!-- No sorting options needed -->
	{/snippet}

	{#snippet content()}
		<div class="result">
			<div class="actions">
				<button
					class="button-outline button-xs"
					disabled={localSelected.length === 0}
					onclick={clearSelection}
					type="button"
				>
					{$_('compare_clear_all')}
				</button>

				<span class="selection-count">
					{$_('compare_municipalities_selected', { values: { count: localSelected.length } })}
					{#if localSelected.length >= 3}
						<span class="max-indicator">({$_('compare_max_reached')})</span>
					{/if}
				</span>

				<div class="actions-right">
					<button class="button-red" onclick={cancel} type="button">
						{$_('custom_collection.dialog.cancel')}
					</button>
					<button
						class="button-primary"
						disabled={localSelected.length === 0}
						onclick={confirm}
						type="button"
					>
						{$_('custom_collection.dialog.accept_selection', {
							values: { count: localSelected.length }
						})}
					</button>
				</div>
			</div>

			<div class="picker-layout">
				<div class="catalog-area">
					<ul class="catalog">
						{#each allMunicipalities as municipality (municipality.guid)}
							{@const isDisabled =
								!localSelected.includes(municipality.guid) && localSelected.length >= 3}
							<li class:disabled={isDisabled}>
								<SelectableCard
									--height="100%"
									bind:value={localSelected}
									container={municipality}
									selectable={true}
								/>
							</li>
						{/each}
						{#if hasMore}
							<div bind:this={loadMoreSentinel} class="load-more-sentinel">
								{#if isLoadingMore}
									<span class="loading-indicator">{$_('loading')}</span>
								{/if}
							</div>
						{/if}
					</ul>
				</div>

				<aside class="selection-panel">
					<div class="selection-header">
						<span class="selection-title">{$_('compare_with')}</span>
						<span class="selection-count-pill">{localSelected.length}</span>
					</div>

					<ul class="selection-list">
						{#each localSelected as guid (guid)}
							{@const item = knownMunicipalities.get(guid)}
							{#if item}
								{@const selectionId = `selected-${guid}`}
								<li class="selection-item">
									<input id={selectionId} type="checkbox" value={guid} bind:group={localSelected} />
									<label for={selectionId}>
										{#if 'title' in item.payload}
											{item.payload.title}
										{:else if 'name' in item.payload}
											{item.payload.name}
										{/if}
									</label>
								</li>
							{/if}
						{/each}
					</ul>
				</aside>
			</div>
		</div>
	{/snippet}
</PickerDialog>

<style>
	.result {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
		min-height: 1px;
	}

	.actions {
		align-items: center;
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		padding: 0.5rem 0;
	}

	.actions-right {
		align-items: center;
		display: flex;
		gap: 0.75rem;
		margin-left: auto;
	}

	.selection-count {
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.max-indicator {
		color: var(--color-orange-600);
		font-weight: 600;
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

	.picker-layout {
		display: grid;
		gap: 1.5rem;
		grid-template-columns: minmax(0, 1fr) 16.5rem;
		min-height: 0;
	}

	.catalog-area {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.catalog li.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.load-more-sentinel {
		display: flex;
		justify-content: center;
		min-height: 2rem;
		padding: 1rem 0;
	}

	.loading-indicator {
		color: var(--color-gray-600);
		font-size: 0.875rem;
	}

	.selection-panel {
		background: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		padding: 1rem;
	}

	.selection-header {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
	}

	.selection-title {
		color: var(--color-gray-800);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.selection-count-pill {
		background: var(--color-primary-700);
		border-radius: 999px;
		color: var(--color-white);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
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
