<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import CheckCircle from '~icons/flowbite/check-circle-outline';
	import CloseCircle from '~icons/flowbite/close-circle-solid';
	import Close from '~icons/knotdots/close';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import saveContainer from '$lib/client/saveContainer';
	import Card from '$lib/components/Card.svelte';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import OrganizationFilterDropDown from '$lib/components/OrganizationFilterDropDown.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import {
		type AnyPayload,
		type Container,
		type CustomCollectionPayload,
		isOrganizationalUnitContainer,
		type OrganizationalUnitPayload,
		payloadTypes
	} from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { user } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';

	interface Props {
		container: Container<CustomCollectionPayload>;
		dialog?: HTMLDialogElement;
	}

	let { container = $bindable(), dialog = $bindable() }: Props = $props();

	let filter: Record<string, string[]> = $state({
		...container.payload.filter,
		organization: container.payload.filter.organization?.length
			? container.payload.filter.organization
			: [page.data.currentOrganization.guid]
	});

	let selected = $state(container.payload.item);

	let sort = $state(container.payload.sort);

	let terms = $state(container.payload.terms);

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });

	let sortBar = createDisclosure({ label: $_('sort') });

	const defaultPayloadType = $derived([
		payloadTypes.enum.event,
		payloadTypes.enum.goal,
		payloadTypes.enum.help,
		payloadTypes.enum.indicator_template,
		payloadTypes.enum.knowledge,
		payloadTypes.enum.measure,
		payloadTypes.enum.organizational_unit,
		payloadTypes.enum.page,
		payloadTypes.enum.post,
		payloadTypes.enum.program,
		payloadTypes.enum.report,
		payloadTypes.enum.rule,
		payloadTypes.enum.task
	] as string[]);

	const categoryContext = $derived(
		filterCategoryContext(
			page.data.categoryContext,
			filter.type && filter.type.length > 0 ? filter.type : defaultPayloadType,
			{
				matchAll: true
			}
		)
	);

	const scopeFilterKeys = ['organization', 'organizationalUnit'];

	let activeFilters = $derived(
		Object.entries(filter)
			.filter(([key]) => !scopeFilterKeys.includes(key))
			.reduce((acc, [, v]) => acc + (v.length > 0 ? 1 : 0), 0)
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
	let searchItems = $state<Container<AnyPayload>[]>([]);
	let searchHasMore = $state(false);
	let searchNextOffset = $state<number | null>(null);
	let searchLoadingMore = $state(false);
	let searchLoadAbortController: AbortController | undefined;

	function buildSearchQuery() {
		const payloadType = filter.type && filter.type.length > 0 ? filter.type : defaultPayloadType;
		const organization =
			filter.organization && filter.organization.length > 0
				? filter.organization
				: organizationsUserIsMemberOf.length > 0
					? organizationsUserIsMemberOf
					: [page.data.currentOrganization.guid];
		return new URLSearchParams([
			...organization.map((org) => ['organization', org]),
			...payloadType.map((t) => ['payloadType', t]),
			...(filter.indicatorCategory ?? []).map((v) => ['indicatorCategory', v]),
			...(filter.organizationalUnit ?? []).map((v) => ['organizationalUnit', v]),
			...(filter.programType ?? []).map((v) => ['programType', v]),
			...(filter.status ?? []).map((v) => ['status', v]),
			...categoryContext.keys.flatMap((k) => (filter[k] ?? []).map((v) => [k, v])),
			['terms', terms],
			['sort', sort]
		]);
	}

	interface SearchPage {
		containers: Container<AnyPayload>[];
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

	let facets = $derived(
		searchResource.current
			? new Map([
					...[...searchResource.current.facets].filter(([k]) => categoryContext.keys.includes(k)),
					...((filter.type?.length == 1 && filter.type[0] == 'program'
						? [['programType', searchResource.current.facets.get('programType')!]]
						: []) as Array<[string, Map<string, number>]>),
					...((filter.type?.length == 1 && filter.type[0] == 'indicator_template'
						? [['indicatorCategory', searchResource.current.facets.get('indicatorCategory')!]]
						: []) as Array<[string, Map<string, number>]>),
					['organization', searchResource.current.facets.get('organization') ?? new Map()],
					[
						'organizationalUnit',
						searchResource.current.facets.get('organizationalUnit') ?? new Map()
					],
					['status', searchResource.current.facets.get('status') ?? new Map()],
					[
						'type',
						new Map(
							[...(searchResource.current.facets.get('type') ?? [])].filter(([k]) =>
								defaultPayloadType.includes(k)
							)
						)
					]
				])
			: new Map<string, Map<string, number>>()
	);

	let organizationOptions = $derived.by(() => {
		const organizationFacetCounts = facets.get('organization') ?? new Map<string, number>();
		const organizationalUnitFacetCounts =
			facets.get('organizationalUnit') ?? new Map<string, number>();
		const visibleOrgGuids = new Set([
			...organizationsUserIsMemberOf,
			page.data.currentOrganization.guid
		]);
		return page.data.organizations
			.filter((o) => visibleOrgGuids.has(o.guid))
			.map((o) => {
				const organizationalUnits = page.data.organizationalUnits.filter(
					(organizationalUnit: Container<OrganizationalUnitPayload>) =>
						organizationalUnit.organization === o.guid
				);
				return {
					value: o.guid,
					label: o.payload.name,
					count: organizationFacetCounts.get(o.guid) ?? 0,
					subOptions: organizationalUnits.map((organizationalUnit) => ({
						value: organizationalUnit.guid,
						label: organizationalUnit.payload.name,
						count: organizationalUnitFacetCounts.get(organizationalUnit.guid) ?? 0,
						subOptions: []
					}))
				};
			});
	});

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
			if (key === 'organization') {
				filter[key] = [page.data.currentOrganization.guid];
			} else {
				filter[key] = [];
			}
		}
	}

	function handleRemoveFilterValue(key: string, value: string) {
		if (key in filter) {
			filter = { ...filter, [key]: filter[key].filter((v) => v !== value) };
		}
	}

	function filterValueLabel(key: string, value: string): string {
		if (key === 'organization') {
			return page.data.organizations.find((o) => o.guid === value)?.payload.name ?? value;
		}
		if (key === 'organizationalUnit') {
			return (
				page.data.organizationalUnits.find(
					(o: Container<OrganizationalUnitPayload>) => o.guid === value
				)?.payload.name ?? value
			);
		}
		return page.data.categoryContext.labels.get(value) ?? $_(value);
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
		{#if organizationOptions.length > 0}
			<OrganizationFilterDropDown
				bind:organizationValue={() => filter.organization ?? [], (v) => (filter.organization = v)}
				bind:organizationalUnitValue={
					() => filter.organizationalUnit ?? [], (v) => (filter.organizationalUnit = v)
				}
				{mode}
				options={organizationOptions}
			/>
		{/if}
		{#each facets.entries() as [key, foci] (key)}
			{#if key !== 'organization' && key !== 'organizationalUnit'}
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

	{#snippet commands()}
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
	{/snippet}

	{#snippet main()}
		<div class="result">
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
	{/snippet}

	{#snippet selection()}
		<div class="selection-panel">
			<div class="selection-actions">
				{#if mode === 'select'}
					<button
						class="selection-clear"
						disabled={selected.length === 0}
						onclick={() => (selected = [])}
						type="button"
					>
						<Close />
						<span>{$_('picker_dialog.clear')}</span>
					</button>
				{/if}
				<button
					class="button-primary selection-apply"
					disabled={mode === 'select' && selected.length === 0}
					onclick={confirm}
					type="button"
				>
					{#if mode === 'select'}
						{$_('picker_dialog.confirm', {
							values: { count: selected.length }
						})}
					{:else}
						{$_('custom_collection.dialog.apply_rule')}
					{/if}
				</button>
			</div>

			{#if mode === 'select' && selected.length > 0}
				<ul class="selection-list">
					{#each selected as guid (guid)}
						{@const item = searchItems.find((item) => item.guid === guid)}
						{#if item}
							{@const selectionId = `selected-${guid}`}
							<li class="selection-item">
								<input id={selectionId} type="checkbox" value={guid} bind:group={selected} />
								<label for={selectionId}>
									{#if 'name' in item.payload}
										{item.payload.name}
									{:else if 'title' in item.payload}
										{item.payload.title}
									{/if}
								</label>
							</li>
						{/if}
					{/each}
				</ul>
			{:else if mode === 'apply_rule'}
				<ul class="selection-list">
					{#each Object.entries(filter) as [key, valueList] (key)}
						{#if valueList.length > 0}
							{#each valueList as value (value)}
								<li class="selection-item">
									<LightningBolt />
									<span>{filterValueLabel(key, value)}</span>
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

	.result {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		min-height: 0;
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

	.selection-panel {
		background: var(--color-white);
		border: 1px solid var(--color-gray-100);
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-height: 0;
		overflow: hidden;
		padding: 0.5rem;
	}

	.selection-actions {
		align-items: center;
		display: flex;
		gap: 0.25rem;
		width: 100%;
	}

	.selection-actions button {
		height: 2.3125rem;
		justify-content: center;
		white-space: nowrap;
	}

	.selection-clear {
		--icon-color: var(--color-gray-900);

		border-color: var(--color-gray-200);
		color: var(--color-gray-900);
		flex: 1 1 auto;
	}

	.selection-clear:hover:not(:disabled),
	.selection-clear:active:not(:disabled) {
		border-color: var(--color-gray-200);
		color: var(--color-gray-900);
	}

	.selection-clear :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.selection-apply {
		flex: 1 1 auto;
		min-width: 0;
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

	.selection-item label,
	.selection-item span {
		color: var(--color-gray-800);
		font-size: 0.875rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.selection-item > :global(svg) {
		flex-shrink: 0;
		max-width: none;
	}
</style>
