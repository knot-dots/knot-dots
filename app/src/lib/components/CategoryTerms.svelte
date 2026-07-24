<script lang="ts">
	import { dragHandleZone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { invalidate } from '$app/navigation';
	import saveContainer from '$lib/client/saveContainer';
	import CategoryTermItem from '$lib/components/CategoryTermItem.svelte';
	import {
		type AnyPayload,
		type CategoryPayload,
		type Container,
		container as containerSchema,
		containerOfType,
		isTermContainer,
		type NewContainer,
		payloadTypes,
		type Predicate,
		predicates,
		type TermPayload
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<CategoryPayload | TermPayload>;
		relatedContainers: Container<AnyPayload>[];
		predicate?: Predicate;
	}

	let {
		container = $bindable(),
		relatedContainers = $bindable(),
		predicate = predicates.enum['is-part-of-category']
	}: Props = $props();

	type TermDragItem = {
		guid: string;
		term?: Container<TermPayload>;
		isCreateForm?: boolean;
	};

	let terms: Container<TermPayload>[] = $derived(
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
			.filter(
				(entry): entry is { position: number; term: Container<TermPayload> } => entry !== null
			)
			.toSorted((a, b) => a.position - b.position)
			.map(({ term }) => {
				let _ = $state(term);
				return _;
			})
	);

	let termItems: TermDragItem[] = $derived.by(() => {
		const termItems = terms.map((term) => ({ guid: term.guid, term }));

		if (showCreateFormAt == -1) {
			return termItems;
		} else {
			return [
				...termItems.slice(0, showCreateFormAt),
				{ guid: '__create-form__', isCreateForm: true },
				...termItems.slice(showCreateFormAt)
			];
		}
	});

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

	let showCreateFormAt = $state(-1);

	function resetForm() {
		formState.title = '';
		formState.value = '';
		formState.description = '';
		formState.filterLabel = '';
		formState.icon = '';
		showCreateFormAt = -1;
	}

	async function showForm(position: number) {
		showCreateFormAt = position;
	}

	async function syncParentRelations(nextTerms: Container<TermPayload>[]) {
		const nextContainerRelation = [
			...nextTerms.map(({ guid }, index) => ({
				object: container.guid,
				position: index,
				predicate,
				subject: guid
			})),
			...container.relation.filter(({ predicate: p }) => p !== predicate)
		];

		const response = await fetch(`/container/${container.guid}/relation`, {
			method: 'POST',
			body: JSON.stringify(nextContainerRelation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			throw new Error(body.message ?? 'Failed to update category');
		}

		container.relation = nextContainerRelation;

		// Commit updated memberships as fresh objects instead of mutating term.relation
		// in place: mutations via the $state proxies created in the terms derived do not
		// write through to the underlying objects in relatedContainers.
		const updatedTermsByGuid = new Map(
			nextTerms.map((term, index) => [
				term.guid,
				{
					...term,
					relation: [
						...term.relation.filter(
							({ object, predicate: p }) => !(object === container.guid && p === predicate)
						),
						{
							object: container.guid,
							position: index,
							predicate,
							subject: term.guid
						}
					]
				}
			])
		);
		relatedContainers = relatedContainers.map(
			(candidate) => updatedTermsByGuid.get(candidate.guid) ?? candidate
		);
	}

	function hasSameOrder(nextTerms: Container<TermPayload>[]) {
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
			.filter((term): term is Container<TermPayload> => Boolean(term));

		if (hasSameOrder(orderedTerms)) {
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

		const previousRelatedContainers = relatedContainers;
		const newTerm = containerOfType(
			payloadTypes.enum.term,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer<TermPayload>;
		newTerm.payload.title = formState.title;
		newTerm.payload.description = formState.description;
		newTerm.payload.filterLabel = formState.filterLabel;
		newTerm.payload.icon = formState.icon;
		newTerm.relation = [
			{
				object: container.guid,
				position: showCreateFormAt,
				predicate
			}
		];
		formState.creating = true;

		try {
			const response = await saveContainer(newTerm);
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to create term');
			}
			const parsed = containerSchema.safeParse(payload);
			if (!parsed.success || !isTermContainer(parsed.data)) {
				throw new Error('Unexpected response while creating term');
			}

			const nextTerms = [
				...terms.slice(0, showCreateFormAt),
				parsed.data,
				...terms.slice(showCreateFormAt)
			];
			relatedContainers = [...relatedContainers, parsed.data];

			await syncParentRelations(nextTerms);
			await invalidate('containers');
			resetForm();
		} catch (error) {
			relatedContainers = previousRelatedContainers;
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			formState.creating = false;
		}
	}

	async function detachTerm(term: Container<TermPayload>) {
		if (removingGuid) {
			return;
		}

		const previousRelatedContainers = relatedContainers;
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
			relatedContainers = relatedContainers.map((c) => (c.guid === term.guid ? updatedTerm : c));
			await syncParentRelations(nextTerms);
		} catch (error) {
			relatedContainers = previousRelatedContainers;
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
		{#if terms.length === 0 && showCreateFormAt < 0}
			{#if canEdit}
				<div class="details-section">
					<button type="button" class="button button-sm button-primary" onclick={() => showForm(0)}>
						<Plus />
						<span>{$_('category.terms.create_button')}</span>
					</button>
				</div>
			{/if}
		{:else}
			<ul
				use:dragHandleZone={{
					items: termItems,
					flipDurationMs: 150,
					morphDisabled: true,
					dropFromOthersDisabled: true,
					dragDisabled: !canEdit || reordering || showCreateFormAt > -1
				}}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				data-reordering={reordering}
			>
				{#each termItems as dragItem, index (dragItem.guid)}
					{@const term = dragItem.term}
					{@const isCreateForm = dragItem.isCreateForm}
					<CategoryTermItem
						{term}
						{isCreateForm}
						{canEdit}
						{reordering}
						{removingGuid}
						bind:formState
						onAdd={() => showForm(index + 1)}
						onRemove={detachTerm}
						onSubmit={handleCreateTerm}
					/>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
