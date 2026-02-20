<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { get } from 'svelte/store';
	import { tick } from 'svelte';
	import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import Plus from '~icons/knotdots/plus';
	import { _ } from 'svelte-i18n';
	import saveContainer from '$lib/client/saveContainer';
	import CategoryTermItem from '$lib/components/CategoryTermItem.svelte';
	import { ability, applicationState } from '$lib/stores';
	import {
		container as containerSchema,
		containerOfType,
		isTermContainer,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates,
		type AnyContainer,
		type CategoryContainer,
		type NewContainer,
		type Predicate,
		type TermContainer
	} from '$lib/models';

	interface Props {
		container: CategoryContainer | TermContainer;
		relatedContainers: AnyContainer[];
		predicate?: Predicate;
		headingKey?: string;
	}

	let {
		container = $bindable(),
		relatedContainers = $bindable(),
		predicate = predicates.enum['is-part-of-category'],
		headingKey = 'category.terms.heading'
	}: Props = $props();

	type TermDragItem = {
		guid: string;
		term?: TermContainer;
		isCreateForm?: boolean;
		[SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean;
	};

	let terms = $derived.by((): TermContainer[] => {
		const relatedTerms = relatedContainers
			.filter(isTermContainer)
			.map((term) => {
				if (term.guid === container.guid) {
					return null;
				}
				const membership = term.relation.find(
					({ object, predicate: p, subject }) =>
						object === container.guid && subject === term.guid && p === predicate
				);
				if (!membership) {
					return null;
				}
				return {
					position: membership.position ?? Number.MAX_SAFE_INTEGER,
					term
				};
			})
			.filter((entry): entry is { position: number; term: TermContainer } => Boolean(entry))
			.toSorted((a, b) => {
				if (a.position !== b.position) {
					return a.position - b.position;
				}
				return a.term.payload.title.localeCompare(b.term.payload.title, undefined, {
					sensitivity: 'base'
				});
			})
			.map(({ term }) => term)
			.map((term) => {
				let _ = $state(term);
				return _;
			});

		return relatedTerms;
	});

	let termItems = $derived.by((): TermDragItem[] => buildTermItems(terms));
	let removingGuid = $state<string | null>(null);
	let reordering = $state(false);
	let reorderError = $state('');

	let formState = $state({
		title: '',
		value: '',
		description: '',
		filterLabel: '',
		icon: '',
		error: '',
		creating: false,
		form: null as HTMLFormElement | null
	});
	let showCreateFormFor = $state<string | null>(null);

	function resetForm() {
		formState.title = '';
		formState.value = '';
		formState.description = '';
		formState.filterLabel = '';
		formState.icon = '';
		formState.error = '';
		showCreateFormFor = null;
	}

	async function focusCreateForm(anchor?: string) {
		showCreateFormFor = anchor ?? 'header';
		await tick();
		formState.form?.querySelector<HTMLInputElement>('input')?.focus();
		formState.form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	const buildTermItems = (items: TermContainer[]): TermDragItem[] =>
		items.map((term) => ({ guid: term.guid, term }));

	const displayItems = $derived.by(() => {
		if (!showCreateFormFor) {
			return termItems;
		}
		const createItem: TermDragItem = { guid: '__create-form__', isCreateForm: true };
		if (showCreateFormFor === 'header') {
			return [createItem, ...termItems];
		}
		const anchorIndex = termItems.findIndex(({ guid }) => guid === showCreateFormFor);
		if (anchorIndex === -1) {
			return [...termItems, createItem];
		}
		const nextItems = [...termItems];
		nextItems.splice(anchorIndex + 1, 0, createItem);
		return nextItems;
	});

	async function syncParentRelations(nextTerms: TermContainer[]) {
		const currentRelations = container.relation ?? [];
		container.relation = [
			...nextTerms.map(({ guid }, index) => ({
				object: container.guid,
				position: index,
				predicate,
				subject: guid
			})),
			...currentRelations.filter(({ predicate: p }) => p !== predicate)
		];

		nextTerms.forEach((term, index) => {
			term.relation = [
				...(term.relation ?? []).filter(
					({ object, predicate: p }) => !(object === container.guid && p === predicate)
				),
				{
					object: container.guid,
					position: index,
					predicate,
					subject: term.guid
				}
			];
		});

		const response = await fetch(`/container/${container.guid}/relation`, {
			method: 'POST',
			body: JSON.stringify(container.relation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			throw new Error(body.message ?? 'Failed to update category');
		}
	}

	function hasSameOrder(nextTerms: TermContainer[]) {
		return (
			nextTerms.length === terms.length &&
			nextTerms.every((term, index) => term.guid === terms[index]?.guid)
		);
	}

	function handleDndConsider(event: CustomEvent<{ items: TermDragItem[] }>) {
		if (!canEdit || reordering || showCreateFormFor) {
			return;
		}

		reorderError = '';
		termItems = event.detail.items;
	}

	async function handleDndFinalize(event: CustomEvent<{ items: TermDragItem[] }>) {
		if (!canEdit || reordering || showCreateFormFor) {
			return;
		}

		const orderedTerms = event.detail.items
			.map(({ term }) => term)
			.filter((term): term is TermContainer => Boolean(term));
		if (hasSameOrder(orderedTerms)) {
			termItems = buildTermItems(terms);
			return;
		}

		const previousTerms = terms;
		terms = orderedTerms;
		reordering = true;
		reorderError = '';
		try {
			await syncParentRelations(orderedTerms);
		} catch (error) {
			reorderError = error instanceof Error ? error.message : String(error);
			terms = previousTerms;
		} finally {
			reordering = false;
		}
	}

	async function handleCreateTerm(event: SubmitEvent) {
		event.preventDefault();
		// Ignore implicit submits (e.g., image upload triggering requestSubmit)
		if (!event.submitter) {
			return;
		}
		if (formState.creating) {
			return;
		}

		const title = formState.title.trim();

		if (!title) {
			formState.error = get(_)('category.terms.required');
			return;
		}

		formState.creating = true;
		formState.error = '';
		try {
			const insertIndex = (() => {
				if (showCreateFormFor === 'header') {
					return 0;
				}
				const anchorIndex = terms.findIndex(({ guid }) => guid === showCreateFormFor);
				return anchorIndex === -1 ? terms.length : anchorIndex + 1;
			})();

			const newTerm = containerOfType(
				payloadTypes.enum.term,
				container.organization,
				container.organizational_unit,
				container.managed_by,
				container.realm
			) as NewContainer;
			const termPayload = newTerm.payload as TermContainer['payload'];
			termPayload.title = title;
			if (formState.description.trim()) {
				termPayload.description = formState.description.trim();
			}
			if (formState.filterLabel.trim()) {
				termPayload.filterLabel = formState.filterLabel.trim();
			}
			if (formState.icon.trim()) {
				termPayload.icon = formState.icon.trim();
			}
			newTerm.relation = [
				{
					object: container.guid,
					position: insertIndex,
					predicate
				}
			];

			const response = await saveContainer(newTerm);
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to create term');
			}
			const parsed = containerSchema.safeParse(payload);
			if (!parsed.success || !isTermContainer(parsed.data)) {
				throw new Error('Unexpected response while creating term');
			}

			const created = parsed.data;
			const nextTerms = [...terms];
			nextTerms.splice(insertIndex, 0, created);
			relatedContainers = [
				...relatedContainers.filter(({ guid }) => guid !== created.guid),
				created
			];
			await syncParentRelations(nextTerms);
			// refresh workspace columns/catalog data without full reload
			await invalidateAll();
			resetForm();
		} catch (error) {
			formState.error = error instanceof Error ? error.message : String(error);
		} finally {
			formState.creating = false;
		}
	}

	async function detachTerm(term: TermContainer) {
		if (removingGuid) {
			return;
		}

		removingGuid = term.guid;
		try {
			const updatedTerm = {
				...term,
				relation: (term.relation ?? []).filter(
					({ object, predicate: p }) => !(object === container.guid && p === predicate)
				)
			};

			const response = await saveContainer(updatedTerm);
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message ?? 'Failed to remove term');
			}

			const nextTerms = terms.filter(({ guid }) => guid !== term.guid);
			terms = nextTerms;
			relatedContainers = relatedContainers.filter(({ guid }) => guid !== term.guid);
			await syncParentRelations(nextTerms);
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			removingGuid = null;
		}
	}

	const canEdit = $derived(
		$applicationState.containerDetailView.editable && $ability.can('update', container)
	);

	const isSubterm = $derived(
		(container.relation ?? []).some(
			({ predicate: p, subject }) =>
				p === predicates.enum['is-part-of'] && subject === container.guid
		)
	);
</script>

{#if !isSubterm}
	<div class="category-terms details-section">
		<div class="category-terms__header">
			<h2>{$_(headingKey)} ({terms.length})</h2>
		</div>

		{#if terms.length === 0 && !showCreateFormFor}
			{#if canEdit}
				<button
					type="button"
					class="button button-sm button-primary category-terms__header-add"
					onclick={() => focusCreateForm('header')}
				>
					<Plus />
					<span>{$_('category.terms.create_button')}</span>
				</button>
			{:else}
				<p class="category-terms__empty">{$_('category.terms.empty')}</p>
			{/if}
		{:else}
			<ul
				class="category-terms__list"
				use:dndzone={{
					items: displayItems,
					flipDurationMs: 150,
					morphDisabled: true,
					dropFromOthersDisabled: true,
					dragDisabled: !canEdit || reordering || Boolean(showCreateFormFor)
				}}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				data-reordering={reordering}
			>
				{#each displayItems as dragItem (dragItem.guid)}
					{@const term = dragItem.term}
					{@const isShadow = dragItem[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
					{@const isCreateForm = dragItem.isCreateForm}
					{@const overlayHref = term ? overlayURL(page.url, overlayKey.enum.view, term.guid) : ''}
					<CategoryTermItem
						{term}
						{isShadow}
						{isCreateForm}
						{canEdit}
						{reordering}
						{removingGuid}
						{overlayHref}
						bind:formState
						onAdd={focusCreateForm}
						onRemove={detachTerm}
						onSubmit={handleCreateTerm}
					/>
				{/each}
			</ul>
			{#if reorderError}
				<p class="category-terms__error" role="alert">{reorderError}</p>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.category-terms {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.category-terms__header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
		justify-content: space-between;
	}

	.category-terms__header h2 {
		margin: 0;
	}

	.category-terms__header-add {
		align-items: center;
		display: inline-flex;
		gap: 0.35rem;
		color: var(--dropdown-button-default-color);
		background: transparent;
		border-color: transparent;
		box-shadow: none;
		padding-left: 0;
		padding-right: 0;
	}

	.category-terms__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.category-terms__list[data-reordering='true'] {
		opacity: 0.75;
	}

	.category-terms__empty,
	.category-terms__error {
		margin: 0;
		color: var(--color-gray-600);
	}

	.category-terms__error {
		color: var(--color-red-600);
	}
</style>
