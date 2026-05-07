<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import CheckCircle from '~icons/flowbite/check-circle-outline';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import saveContainer from '$lib/client/saveContainer';
	import Card from '$lib/components/Card.svelte';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import {
		type AnyContainer,
		type CustomCollectionContainer,
		isOrganizationalUnitContainer,
		type PayloadType,
		payloadTypes
	} from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { user } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';

	interface Props {
		container: CustomCollectionContainer;
		dialog?: HTMLDialogElement;
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
		payloadTypes.enum.page,
		payloadTypes.enum.program,
		payloadTypes.enum.report,
		payloadTypes.enum.rule,
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

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0)
	);

	// svelte-ignore state_referenced_locally
	let mode: 'select' | 'apply_rule' = $state(
		selected.length > 0 || activeFilters == 0 ? 'select' : 'apply_rule'
	);

	let organizationsUserIsMemberOf = $derived(
		[...$user.adminOf, ...$user.headOf, ...$user.collaboratorOf, ...$user.memberOf].filter(
			(value) => page.data.organizations.map((o) => o.guid).includes(value)
		)
	);

	const inViewport = new IsInViewport(() => dialog);

	// Accumulated items across loaded pages
	let searchItems = $state<AnyContainer[]>([]);
	let searchHasMore = $state(false);
	let searchNextOffset = $state<number | null>(null);
	let searchLoadingMore = $state(false);
	let searchLoadAbortController: AbortController | undefined;

	function buildSearchQuery() {
		const query = new URLSearchParams();
		const payloadType = filter.type && filter.type.length > 0 ? filter.type : defaultPayloadType;

		const orgs =
			mode === 'select'
				? Array.from(new Set([page.data.currentOrganization.guid, ...organizationsUserIsMemberOf]))
				: [page.data.currentOrganization.guid];
		for (const org of orgs) query.append('organization', org);

		for (const t of payloadType) query.append('payloadType', t);
		if (filter.indicatorCategory) {
			for (const v of filter.indicatorCategory) query.append('indicatorCategory', v);
		}
		if (filter.programType) {
			for (const v of filter.programType) query.append('programType', v);
		}
		for (const k of categoryContext.keys) {
			if (k in filter) {
				for (const v of filter[k]) query.append(k, v);
			}
		}
		if (terms) query.set('terms', terms);
		query.set('sort', sort);
		return query;
	}

	interface SearchPage {
		containers: AnyContainer[];
		facets: Map<string, Map<string, number>>;
		hasMore: boolean;
		nextOffset: number | null;
	}

	const searchResource = resource(
		[() => $state.snapshot(filter), () => sort, () => terms, () => inViewport.current, () => mode],
		async ([, , , inViewport], _, { signal }): Promise<SearchPage> => {
			if (!inViewport)
				return { containers: [], facets: new Map(), hasMore: false, nextOffset: null };

			const query = buildSearchQuery();
			const result = await fetchContainerPage({
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset: 0,
				query,
				signal
			});
			return {
				containers: result.containers,
				facets: result.facets,
				hasMore: result.page.hasMore,
				nextOffset: result.page.nextOffset
			};
		},
		{
			debounce: 300,
			lazy: true
		}
	);

	let facets = $derived(searchResource.current?.facets ?? new Map<string, Map<string, number>>());

	$effect(() => {
		const result = searchResource.current;
		if (result) {
			searchItems = result.containers;
			searchHasMore = result.hasMore;
			searchNextOffset = result.nextOffset;
		}
	});

	async function loadMoreSearch() {
		if (searchLoadingMore || !searchHasMore || searchNextOffset === null) return;

		searchLoadAbortController?.abort();
		const controller = new AbortController();
		searchLoadAbortController = controller;
		searchLoadingMore = true;

		try {
			const query = buildSearchQuery();
			const result = await fetchContainerPage({
				fetch,
				limit: DEFAULT_PAGE_SIZE,
				offset: searchNextOffset,
				query,
				signal: controller.signal
			});

			if (controller.signal.aborted || searchLoadAbortController !== controller) return;

			searchItems = [...searchItems, ...result.containers];
			searchHasMore = result.page.hasMore;
			searchNextOffset = result.page.nextOffset;
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
		} finally {
			if (!controller.signal.aborted && searchLoadAbortController === controller) {
				searchLoadingMore = false;
			}
		}
	}

	function resetFilters() {
		for (const key in filter) {
			filter[key] = [];
		}
	}

	function handleRemoveFilterValue(key: string, value: string) {
		if (key in filter) {
			filter = { ...filter, [key]: filter[key].filter((v) => v !== value) };
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
	title={$_('custom_collection.dialog.title')}
>
	{#snippet filterContent()}
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
			{#if options.some(({ count, subOptions }) => count > 0 || subOptions?.some(({ count }) => count > 0))}
				<InlineFilterDropDown
					bind:value={() => filter[key] ?? [], (v) => (filter[key] = v)}
					{key}
					label={categoryContext.labels.get(key)}
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
						<button autofocus class="button-red" onclick={() => dialog?.close()} type="button">
							{$_('custom_collection.dialog.cancel')}
						</button>
					</li>
				</ul>

				{#if searchItems.length > 0 || searchResource.current !== undefined}
					<ul class="catalog">
						{#each searchItems as item (item.guid)}
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
						<LazyLoadSentinel
							as="li"
							hasMore={searchHasMore}
							loading={searchLoadingMore}
							onLoadMore={loadMoreSearch}
						/>
					</ul>
				{/if}
			</div>

			<div class="preview">
				<button
					class="button-primary"
					disabled={mode === 'select' && selected.length === 0}
					onclick={confirm}
					type="button"
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
							{@const item = searchItems.find((item) => item.guid === guid)}
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
				{:else if mode === 'apply_rule'}
					<ul>
						{#each Object.entries(filter) as [key, valueList] (key)}
							{#if valueList.length > 0}
								{#each valueList as value (value)}
									<li class="preview-item">
										<LightningBolt />
										{page.data.categoryContext.labels.get(value) ?? $_(value)}
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
	.sort-option {
		border-radius: 8px;
		gap: 0;
		padding: 0.5rem 0.625rem;
	}

	.sort-option > input {
		appearance: none;
	}

	.sort-option > :global(svg) {
		height: 1rem;
		margin-right: 0.375rem;
		width: 1rem;
	}

	.sort-option:focus-within,
	.sort-option:hover {
		background-color: var(--color-primary-100);
	}

	.sort-option:has(> input:active) {
		background-color: var(--color-primary-300);
		color: var(--color-primary-700);
	}

	.sort-option:has(> input:checked) {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
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
		flex-grow: 1;
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
