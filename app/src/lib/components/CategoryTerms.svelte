<script lang="ts">
	import { dragHandleZone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { invalidateAll } from '$app/navigation';
	import saveContainer from '$lib/client/saveContainer';
	import CategoryTermItem from '$lib/components/CategoryTermItem.svelte';
	import {
		type AnyContainer,
		type CategoryContainer,
		container as containerSchema,
		containerOfType,
		isTermContainer,
		type NewContainer,
		payloadTypes,
		type Predicate,
		predicates,
		type TermContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: CategoryContainer | TermContainer;
		relatedContainers: AnyContainer[];
		predicate?: Predicate;
	}

	let {
		container = $bindable(),
		relatedContainers = $bindable(),
		predicate = predicates.enum['is-part-of-category']
	}: Props = $props();

	type TermDragItem = {
		guid: string;
		term?: TermContainer;
		isCreateForm?: boolean;
	};

	let terms: TermContainer[] = $derived(
		relatedContainers
			.filter(isTermContainer)
			.filter(({ guid }) => guid !== container.guid)
			.map((term) => {
				const membership = term.relation.find(
					({ object, predicate: p, subject }) =>
						object === container.guid && subject === term.guid && p === predicate
				);
				if (!membership) {
					return null;
				}
				return {
					position: membership.position,
					term
				};
			})
			.filter((entry): entry is { position: number; term: TermContainer } => entry !== null)
			.toSorted((a, b) => a.position - b.position)
			.map(({ term }) => {
				let _ = $state(term);
				return _;
			})
	);

	let termItems = $derived.by((): TermDragItem[] => buildTermItems(terms));
	let removingGuid = $state<string | null>(null);
	let reordering = $state(false);

	let formState = $state({
		title: '',
		value: '',
		description: '',
		filterLabel: '',
		icon: '',
		creating: false
	});

	let showCreateFormFor = $state<string | null>(null);

	function resetForm() {
		formState.title = '';
		formState.value = '';
		formState.description = '';
		formState.filterLabel = '';
		formState.icon = '';
		showCreateFormFor = null;
	}

	async function showForm(anchor?: string) {
		showCreateFormFor = anchor ?? 'header';
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
		const currentRelations = container.relation;
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
				...term.relation.filter(
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
		termItems = event.detail.items;
	}

	async function handleDndFinalize(event: CustomEvent<{ items: TermDragItem[] }>) {
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
		try {
			await syncParentRelations(orderedTerms);
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
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

		formState.creating = true;
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
			) as Omit<NewContainer, 'payload'> & Pick<TermContainer, 'payload'>;
			newTerm.payload.title = formState.title;
			newTerm.payload.description = formState.description;
			newTerm.payload.filterLabel = formState.filterLabel;
			newTerm.payload.icon = formState.icon;
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
			alert(error instanceof Error ? error.message : String(error));
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
		container.relation.some(
			({ predicate: p, subject }) =>
				p === predicates.enum['is-part-of'] && subject === container.guid
		)
	);
</script>

{#if !isSubterm}
	<div class="sections">
		{#if terms.length === 0 && !showCreateFormFor}
			{#if canEdit}
				<div class="details-section">
					<button
						type="button"
						class="button button-sm button-primary"
						onclick={() => showForm('header')}
					>
						<Plus />
						<span>{$_('category.terms.create_button')}</span>
					</button>
				</div>
			{/if}
		{:else}
			<ul
				use:dragHandleZone={{
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
					{@const isCreateForm = dragItem.isCreateForm}
					<CategoryTermItem
						{term}
						{isCreateForm}
						{canEdit}
						{reordering}
						{removingGuid}
						bind:formState
						onAdd={showForm}
						onRemove={detachTerm}
						onSubmit={handleCreateTerm}
					/>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
