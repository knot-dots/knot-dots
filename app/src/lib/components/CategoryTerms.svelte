<script lang="ts">
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { dndzone, dragHandle, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import DragHandle from '~icons/knotdots/draghandle';
	import { _ } from 'svelte-i18n';
	import saveContainer from '$lib/client/saveContainer';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import { ability } from '$lib/stores';
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
		[SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean;
	};

	// eslint-disable-next-line svelte/prefer-writable-derived
	let terms = $state([] as TermContainer[]);
	// eslint-disable-next-line svelte/prefer-writable-derived
	let termItems = $state([] as TermDragItem[]);
	let creating = $state(false);
	let removingGuid = $state<string | null>(null);
	let formError = $state('');
	let reordering = $state(false);
	let reorderError = $state('');

	let newTitle = $state('');
	let newValue = $state('');
	let newDescription = $state('');
	let newFilterLabel = $state('');
	let newIcon = $state('');
	let valueTouched = $state(false);

	$effect(() => {
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
			.map(({ term }) => term);

		terms = relatedTerms;
	});

	$effect(() => {
		termItems = terms.map((term) => ({ guid: term.guid, term }));
	});

	function slugify(source: string) {
		return source
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_.-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	$effect(() => {
		if (!valueTouched) {
			newValue = slugify(newTitle);
		}
	});

	function resetForm() {
		newTitle = '';
		newValue = '';
		newDescription = '';
		newFilterLabel = '';
		newIcon = '';
		valueTouched = false;
		formError = '';
	}

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
		if (!canEdit || reordering) {
			return;
		}

		reorderError = '';
		termItems = event.detail.items;
	}

	async function handleDndFinalize(event: CustomEvent<{ items: TermDragItem[] }>) {
		if (!canEdit || reordering) {
			return;
		}

		const orderedTerms = event.detail.items
			.map(({ term }) => term)
			.filter((term): term is TermContainer => Boolean(term));
		if (hasSameOrder(orderedTerms)) {
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
		if (creating) {
			return;
		}

		const title = newTitle.trim();
		const value = newValue.trim();

		if (!title || !value) {
			formError = get(_)('category.terms.required');
			return;
		}

		creating = true;
		formError = '';
		try {
			const newTerm = containerOfType(
				payloadTypes.enum.term,
				container.organization,
				container.organizational_unit,
				container.managed_by,
				container.realm
			) as NewContainer;
			const termPayload = newTerm.payload as TermContainer['payload'];
			termPayload.title = title;
			termPayload.value = value;
			if (newDescription.trim()) {
				termPayload.description = newDescription.trim();
			}
			if (newFilterLabel.trim()) {
				termPayload.filterLabel = newFilterLabel.trim();
			}
			if (newIcon.trim()) {
				termPayload.icon = newIcon.trim();
			}
			newTerm.relation = [
				{
					object: container.guid,
					position: terms.length,
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
			const nextTerms = [...terms, created];
			relatedContainers = [
				...relatedContainers.filter(({ guid }) => guid !== created.guid),
				created
			];
			await syncParentRelations(nextTerms);
			resetForm();
		} catch (error) {
			formError = error instanceof Error ? error.message : String(error);
		} finally {
			creating = false;
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
			relatedContainers = relatedContainers.filter(({ guid }) => guid !== term.guid);
			await syncParentRelations(nextTerms);
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			removingGuid = null;
		}
	}

	const canEdit = $derived($ability.can('update', container));

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
			<h2>{$_(headingKey)}</h2>
		</div>

		{#if terms.length === 0}
			<p class="category-terms__empty">{$_('category.terms.empty')}</p>
		{:else}
			<ul
				class="category-terms__list"
				use:dndzone={{
					items: termItems,
					flipDurationMs: 150,
					dropFromOthersDisabled: true,
					dragDisabled: !canEdit || reordering
				}}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				data-reordering={reordering}
			>
				{#each termItems as dragItem (dragItem.guid)}
					{@const term = dragItem.term}
					{@const isShadow = dragItem[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
					<li
						class="category-terms__item"
						class:category-terms__item--draggable={canEdit && !isShadow}
						class:category-terms__item--placeholder={isShadow}
					>
						{#if term && !isShadow}
							{#if canEdit}
								<div class="actions is-visible-on-hover category-terms__actions">
									<span class="drag-handle" use:dragHandle>
										<DragHandle />
									</span>
								</div>
							{/if}
							<a
								class="category-terms__link"
								href={overlayURL(page.url, overlayKey.enum.view, term.guid)}
							>
								<h3 class="details-heading">{term.payload.title}</h3>
								<p class="category-terms__value">
									{$_('category.terms.value_label')}: {term.payload.value}
								</p>
							</a>

							{#if canEdit}
								<button
									type="button"
									class="button button-xs button-alternative"
									onclick={() => detachTerm(term)}
									disabled={removingGuid === term.guid || reordering}
								>
									{$_('category.terms.remove_button')}
								</button>
							{/if}
						{:else}
							<span class="category-terms__placeholder-hint" aria-hidden="true">⋯⋯</span>
						{/if}
					</li>
				{/each}
			</ul>
			{#if reorderError}
				<p class="category-terms__error" role="alert">{reorderError}</p>
			{/if}
		{/if}

		{#if canEdit && !isSubterm}
			<form class="category-terms__form" onsubmit={handleCreateTerm}>
				<h3>{$_('category.terms.create_title')}</h3>

				<label>
					<span>{$_('title')}</span>
					<input type="text" placeholder={$_('title')} required bind:value={newTitle} />
				</label>

				<label>
					<span>{$_('category.terms.value_label')}</span>
					<input
						type="text"
						placeholder={$_('category.terms.value_label')}
						required
						bind:value={newValue}
						oninput={() => (valueTouched = true)}
					/>
				</label>

				<label>
					<span>{$_('description')}</span>
					<textarea
						rows="2"
						placeholder={$_('category.terms.description_placeholder')}
						bind:value={newDescription}
					></textarea>
				</label>

				<label>
					<span>{$_('category.terms.filter_label')}</span>
					<input
						type="text"
						placeholder={$_('category.terms.filter_label')}
						bind:value={newFilterLabel}
					/>
				</label>

				<EditableImage
					editable
					allowedFileTypes={['image/svg+xml']}
					help={$_('upload.image.svg_only_help')}
					label={$_('category.terms.icon')}
					bind:value={newIcon}
				/>

				{#if formError}
					<p class="category-terms__error">{formError}</p>
				{/if}

				<button class="button button-primary" type="submit" disabled={creating}>
					{$_('category.terms.create_button')}
				</button>
			</form>
		{/if}
	</div>
{/if}

<style>
	.category-terms {
		gap: 1rem;
		display: flex;
		flex-direction: column;
	}

	.category-terms__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.category-terms__item {
		align-items: center;
		background: var(--color-gray-050);
		border-radius: 8px;
		display: flex;
		justify-content: space-between;
		padding: 0.75rem;
		gap: 1rem;
		position: relative;
	}

	.category-terms__actions {
		--dropdown-button-icon-default-color: var(--color-gray-700);
		--dropdown-button-icon-size: 1rem;

		align-items: center;
		background: white;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		gap: 0.25rem;
		left: -2.75rem;
		padding: 0.25rem;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 1;
	}

	.category-terms__actions .drag-handle {
		padding: 0.25rem;
	}

	.category-terms__actions .drag-handle :global(svg) {
		color: var(--dropdown-button-icon-default-color);
		height: 1rem;
		width: 1rem;
	}

	.category-terms__link {
		color: inherit;
		display: block;
		flex: 1;
		text-decoration: none;
	}

	.category-terms__link:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.category-terms__item--draggable {
		cursor: grab;
	}

	.category-terms__item--draggable:active {
		cursor: grabbing;
	}

	.category-terms__item--placeholder {
		opacity: 0.6;
		border: 1px dashed var(--color-gray-400);
		background: transparent;
		justify-content: center;
		min-height: 2.5rem;
	}

	.category-terms__item--placeholder .category-terms__actions {
		display: none;
	}

	.category-terms__placeholder-hint {
		font-size: 1.25rem;
		letter-spacing: 0.25rem;
		color: var(--color-gray-400);
	}

	.category-terms__list[data-reordering='true'] {
		opacity: 0.7;
	}

	@media (hover: hover) {
		.category-terms__item:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}

	.category-terms__title {
		font-weight: 600;
		margin: 0;
	}

	.category-terms__value,
	.category-terms__filter,
	.category-terms__description {
		margin: 0.125rem 0 0;
		color: var(--color-gray-600);
		font-size: 0.875rem;
	}

	.category-terms__form {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.category-terms__form h3,
	.category-terms__header h2 {
		margin: 0;
	}

	.category-terms__form label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.category-terms__form input,
	.category-terms__form textarea {
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		padding: 0.5rem;
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
