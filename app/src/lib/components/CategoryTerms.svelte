<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { get } from 'svelte/store';
	import { tick } from 'svelte';
	import { dndzone, dragHandle, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import DragHandle from '~icons/knotdots/draghandle';
	import Plus from '~icons/knotdots/plus';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import { _ } from 'svelte-i18n';
	import saveContainer from '$lib/client/saveContainer';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import transformFileURL from '$lib/transformFileURL';
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
		let openMenuGuid = $state<string | null>(null);
		let showCreateFormFor = $state<string | null>(null);
		let createForm = $state<HTMLFormElement | null>(null);
		let titleInput = $state<HTMLInputElement | null>(null);

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
			showCreateFormFor = null;
		}

		async function focusCreateForm(anchor?: string) {
			openMenuGuid = null;
			showCreateFormFor = anchor ?? 'header';
			await tick();
			if (titleInput) {
				titleInput.focus();
			}
			createForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}

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
						<li
							class="category-terms__item details-section"
							class:category-terms__item--draggable={canEdit && !isShadow && !isCreateForm}
							class:category-terms__item--placeholder={isShadow}
						>
							{#if isCreateForm}
								<form class="category-terms__form" onsubmit={handleCreateTerm} bind:this={createForm}>
									<h3>{$_('category.terms.create_title')}</h3>

									<label>
										<span>{$_('title')}</span>
										<input
											type="text"
											placeholder={$_('title')}
											required
											bind:value={newTitle}
											bind:this={titleInput}
										/>
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
							{:else if term && !isShadow}
								{#if canEdit}
									<div class="actions is-visible-on-hover category-terms__actions category-terms__actions--left">
										<button
											type="button"
											class="category-terms__add-button"
											onclick={() => focusCreateForm(term.guid)}
											aria-label={$_('category.terms.create_button')}
										>
											<Plus />
										</button>
										<span class="drag-handle" use:dragHandle>
											<DragHandle />
										</span>
									</div>
									<div class="actions is-visible-on-hover category-terms__actions category-terms__actions--right">
										<button
											class="dropdown-button category-terms__menu-button"
											type="button"
											onclick={() => (openMenuGuid = openMenuGuid === term.guid ? null : term.guid)}
											disabled={reordering}
											aria-expanded={openMenuGuid === term.guid}
											aria-label={$_('category.terms.remove_button')}
										>
											<Ellipsis />
										</button>

										{#if openMenuGuid === term.guid}
											<fieldset class="dropdown-panel category-terms__menu-panel">
												<button
													class="action-button action-button--padding-tight"
													type="button"
													onclick={() => {
														openMenuGuid = null;
														detachTerm(term);
													}}
													disabled={removingGuid === term.guid || reordering}
												>
													<TrashBin />
													<span>{$_('category.terms.remove_button')}</span>
												</button>
											</fieldset>
										{/if}
									</div>
								{/if}
								<a
									class="category-terms__content"
									href={overlayURL(page.url, overlayKey.enum.view, term.guid)}
								>
									<h3 class="details-heading">
										{#if term.payload.icon}
											<img src={transformFileURL(term.payload.icon)} alt="" class="category-terms__icon" />
										{/if}
										{term.payload.title}
									</h3>
									<div class="category-terms__meta">
										{#if term.payload.filterLabel}
											<span aria-hidden="true">•</span>
											<span class="category-terms__meta-item">
												{$_('category.terms.filter_label')}: {term.payload.filterLabel}
											</span>
										{/if}
									</div>
									<p class="category-terms__description">
										{#if term.payload.description}
											{term.payload.description}
										{:else}
											&nbsp;
										{/if}
									</p>
								</a>

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

		.category-terms__item {
			position: relative;
			background: white;
			border: 1px solid var(--color-gray-200);
			border-radius: 12px;
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			padding: 1rem 1.25rem;
			transition: box-shadow 120ms ease;
		}

		.category-terms__item--draggable {
			cursor: grab;
		}

		.category-terms__item--draggable:active {
			cursor: grabbing;
		}

		.category-terms__item:hover {
			box-shadow: var(--shadow-sm);
		}

		.category-terms__item--placeholder {
			align-items: center;
			background: transparent;
			border: 1px dashed var(--color-gray-300);
			color: var(--color-gray-400);
			justify-content: center;
			min-height: 3.25rem;
		}

		.category-terms__item--placeholder .category-terms__actions {
			display: none;
		}

		.category-terms__placeholder-hint {
			font-size: 1.25rem;
			letter-spacing: 0.25rem;
		}

		.category-terms__content {
			color: inherit;
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
			text-decoration: none;
		}

		.category-terms__item :global(.details-heading) {
			color: var(--color-gray-800);
			font-size: 1rem;
			font-weight: 600;
			margin: 0;
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
		}

		.category-terms__icon {
			height: 1.4rem;
			width: 1.4rem;
			object-fit: contain;
			margin-right: 0.15rem;
		}

		.category-terms__content:focus-visible {
			outline: 2px solid var(--color-primary-500);
			outline-offset: 3px;
		}

		.category-terms__meta {
			align-items: center;
			color: var(--color-gray-600);
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			font-size: 0.95rem;
			margin: 0;
		}

		.category-terms__meta-item {
			display: inline-flex;
			gap: 0.25rem;
		}

		.category-terms__description {
			color: var(--color-gray-700);
			margin: 0;
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
			padding: 0.25rem;
			position: absolute;
			top: 0.5rem;
			z-index: 1;
		}

		.category-terms__actions--left {
			left: -3.25rem;
		}

		.category-terms__actions--right {
			right: -3.25rem;
		}

		.category-terms__actions .drag-handle {
			padding: 0.25rem;
		}

		.category-terms__actions .drag-handle :global(svg) {
			color: var(--dropdown-button-icon-default-color);
			height: 1rem;
			width: 1rem;
		}

		.category-terms__add-button {
			align-items: center;
			background: white;
			border: 1px solid var(--color-gray-200);
			border-radius: 8px;
			box-shadow: var(--shadow-xs);
			display: inline-flex;
			height: 2rem;
			justify-content: center;
			margin-right: 0.15rem;
			padding: 0.25rem 0.4rem;
			width: 2rem;
		}

		.category-terms__add-button :global(svg) {
			height: 1rem;
			width: 1rem;
		}

		.category-terms__menu-button {
			align-items: center;
			background: white;
			border-radius: 8px;
			border: 1px solid var(--color-gray-200);
			box-shadow: var(--shadow-xs);
			display: inline-flex;
			height: 2rem;
			justify-content: center;
			padding: 0.25rem 0.4rem;
			width: 2rem;
		}

		.category-terms__menu-button :global(svg) {
			height: 1rem;
			width: 1rem;
		}

		.category-terms__menu-panel {
			background: white;
			border: 1px solid var(--color-gray-200);
			border-radius: 12px;
			box-shadow: var(--shadow-md);
			min-width: 10rem;
			position: absolute;
			right: 0;
			top: calc(100% + 0.25rem);
			padding: 0.25rem;
		}

		.category-terms__menu-panel .action-button {
			align-items: center;
			color: var(--color-red-600);
			display: flex;
			gap: 0.35rem;
			padding: 0.5rem 0.75rem;
			width: 100%;
		}

		.category-terms__empty,
		.category-terms__error {
			margin: 0;
			color: var(--color-gray-600);
		}

		.category-terms__error {
			color: var(--color-red-600);
		}

		.category-terms__form {
			background: white;
			border: 1px solid var(--color-gray-200);
			border-radius: 12px;
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			padding: 1rem;
		}

		.category-terms__form h3 {
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

		@media (hover: hover) {
			.category-terms__item:hover {
				--is-visible-on-hover-transition: visibility 0s 0.3s linear;
				--is-visible-on-hover-visibility: visible;
			}
		}
	</style>
