<script lang="ts">
	import { IsInViewport } from 'runed';
	import { SvelteMap } from 'svelte/reactivity';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import createPaginatedResource from '$lib/client/createPaginatedResource.svelte';
	import fetchContainerPage from '$lib/client/fetchContainerPage';
	import saveContainer from '$lib/client/saveContainer';
	import InlineFilterDropDown from '$lib/components/InlineFilterDropDown.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import PickerDialog from '$lib/components/PickerDialog.svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';
	import {
		type AnyPayload,
		type Container,
		type Relation,
		type RelationCollectionPayload
	} from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { ability } from '$lib/stores';
	import { sortIcons } from '$lib/theme/models';

	interface Props {
		container: Container<RelationCollectionPayload>;
		dialog?: HTMLDialogElement;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		dialog = $bindable(),
		parentContainer,
		relatedContainers = $bindable()
	}: Props = $props();

	let filterBar = createDisclosure({ label: $_('filters'), expanded: true });

	let sortBar = createDisclosure({ label: $_('sort') });

	let filter = $state<Record<string, string[]>>({});

	let sort = $state('alpha');

	let terms = $state('');

	let selected = $state<string[]>([]);

	const categoryContext = $derived(
		filterCategoryContext(page.data.categoryContext, [container.payload.payloadType])
	);

	let activeFilters = $derived(
		Object.values(filter).reduce((acc, v) => acc + (v.length > 0 ? 1 : 0), 0)
	);

	// Nothing is fetched before the dialog is opened.
	const inViewport = new IsInViewport(() => dialog);

	// Selected objects stay known after they dropped out of the visible list,
	// for example after a search.
	let knownItems = new SvelteMap<string, Container<AnyPayload>>();

	const filterKey = $derived(
		[
			inViewport.current,
			container.payload.payloadType,
			...Object.entries(filter).map(([key, values]) => `${key}=${values.join(',')}`),
			sort,
			terms
		].join('|')
	);

	const candidates = createPaginatedResource({
		debounce: 300,
		fetchPage: async ({ limit, offset, signal }) => {
			if (!inViewport.current) {
				return [];
			}

			// Objects are offered from the area the section belongs to: the same
			// organization and the same organizational unit, if any.
			const query = new URLSearchParams([
				['organization', parentContainer.organization],
				['organizationalUnit', parentContainer.organizational_unit ?? ''],
				['payloadType', container.payload.payloadType],
				['sort', sort]
			]);

			const currentFilter = $state.snapshot(filter);
			for (const key of categoryContext.keys) {
				for (const value of currentFilter[key] ?? []) {
					query.append(key, value);
				}
			}

			if (terms) {
				query.append('terms', terms);
			}

			const { containers } = await fetchContainerPage({ fetch, limit, offset, query, signal });
			return containers;
		},
		getKey: ({ guid }: Container<AnyPayload>) => guid,
		pageSize: DEFAULT_PAGE_SIZE,
		resetKey: () => filterKey
	});

	// Containers the section's container is itself related to through the
	// predicate must not become related to it in the opposite direction.
	let superordinate = $derived(
		parentContainer.relation
			.filter(
				({ predicate, subject }) =>
					predicate === container.payload.predicate && subject === parentContainer.guid
			)
			.map(({ object }) => object)
	);

	// The relation is saved through the object that is added, so only objects
	// the user may edit are offered.
	let items = $derived(
		candidates.items.filter(
			(item) =>
				item.guid !== parentContainer.guid &&
				!container.payload.item.includes(item.guid) &&
				!superordinate.includes(item.guid) &&
				$ability.can('update', item)
		)
	);

	$effect(() => {
		for (const item of candidates.current ?? []) {
			knownItems.set(item.guid, item);
		}
	});

	function resetFilters() {
		for (const key in filter) {
			filter[key] = [];
		}
	}

	function onchange(event: Event & { currentTarget: HTMLInputElement }) {
		selected = event.currentTarget.checked
			? [...selected, event.currentTarget.value]
			: selected.filter((guid) => guid !== event.currentTarget.value);
	}

	async function addRelation(guid: string): Promise<Relation | undefined> {
		const relation = {
			object: parentContainer.guid,
			position: 0,
			predicate: container.payload.predicate,
			subject: guid
		};
		const response = await fetch(`/container/${guid}/relation`, {
			body: JSON.stringify([relation]),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		});
		return response.ok ? relation : undefined;
	}

	async function confirm() {
		// Some relations may be saved while others fail, so the section lists
		// exactly the objects whose relation was saved.
		const relations = (await Promise.all(selected.map(addRelation))).filter(
			(relation) => relation !== undefined
		);
		const failed = selected.length - relations.length;

		if (relations.length > 0) {
			const response = await saveContainer({
				...container,
				payload: {
					...container.payload,
					item: [...container.payload.item, ...relations.map(({ subject }) => subject)]
				}
			});
			if (response.ok) {
				const updatedContainer = await response.json();
				relatedContainers = [
					...relatedContainers.filter(
						({ guid }) => !relations.some(({ subject }) => subject === guid)
					),
					...relations.flatMap((relation) => {
						const item = knownItems.get(relation.subject);
						return item ? [{ ...item, relation: [...item.relation, relation] }] : [];
					})
				];
				container.payload = updatedContainer.payload;
				container.revision = updatedContainer.revision;
			} else {
				const error = await response.json();
				alert(error.message);
			}
		}

		if (failed > 0) {
			alert($_('relation_collection.add_existing_items.failed', { values: { count: failed } }));
		}

		selected = [];
		dialog?.close();
		await invalidateAll();
	}
</script>

<PickerDialog
	bind:dialog
	bind:terms
	{activeFilters}
	{filterBar}
	{sortBar}
	onResetFilters={resetFilters}
	title={$_('relation_collection.add_existing_items')}
>
	{#snippet filterContent()}
		{#each categoryContext.keys as key (key)}
			<InlineFilterDropDown
				{key}
				label={categoryContext.labels.get(key)}
				mode="select"
				options={categoryContext.options[key]}
				bind:value={() => filter[key] ?? [], (v) => (filter[key] = v)}
			/>
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

	{#snippet main()}
		<div class="result">
			<ul class="catalog">
				{#each items as item (item.guid)}
					<li>
						<SelectableCard
							--height="100%"
							checked={selected.includes(item.guid)}
							container={item}
							{onchange}
						/>
					</li>
				{/each}
				<LazyLoadSentinel
					as="li"
					disabled={candidates.items.length === 0}
					hasMore={candidates.hasMore}
					loading={candidates.loadingMore}
					onLoadMore={candidates.loadMore}
				/>
			</ul>
		</div>
	{/snippet}

	{#snippet selection()}
		<div class="selection-panel">
			<div class="selection-actions">
				<button
					class="selection-clear"
					disabled={selected.length === 0}
					onclick={() => (selected = [])}
					type="button"
				>
					<Close />
					<span>{$_('picker_dialog.clear')}</span>
				</button>
				<button
					class="button-primary system-primary selection-apply"
					disabled={selected.length === 0}
					onclick={confirm}
					type="button"
				>
					{$_('picker_dialog.confirm', {
						values: { count: selected.length }
					})}
				</button>
			</div>

			{#if selected.length > 0}
				<ul class="selection-list">
					{#each selected as guid (guid)}
						{@const item = knownItems.get(guid)}
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
			{/if}
		</div>
	{/snippet}
</PickerDialog>

<style>
	.result {
		display: flex;
		flex-direction: column;
		min-height: 0;
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
		display: none;
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

	@container (min-width: 48rem) {
		.selection-list {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			margin: 0;
			overflow: auto;
			padding: 0;
		}
	}
</style>
