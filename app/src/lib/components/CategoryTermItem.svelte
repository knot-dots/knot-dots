<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import DragHandle from '~icons/knotdots/draghandle';
	import Plus from '~icons/knotdots/plus';
	import { _ } from 'svelte-i18n';
	import CategoryTermMenu from '$lib/components/CategoryTermMenu.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import transformFileURL from '$lib/transformFileURL';
	import type { TermContainer } from '$lib/models';

	interface Props {
		term?: TermContainer;
		isShadow?: boolean;
		isCreateForm?: boolean;
		canEdit?: boolean;
		reordering?: boolean;
		removingGuid?: string | null;
		createForm?: HTMLFormElement | null;
		newTitle?: string;
		newValue?: string;
		newDescription?: string;
		newFilterLabel?: string;
		newIcon?: string;
		formError?: string;
		creating?: boolean;
		overlayHref?: string;
		onAdd?: (guid: string) => void;
		onRemove?: (term: TermContainer) => void;
		onSubmit?: (event: SubmitEvent) => void;
	}

	let {
		term,
		isShadow = false,
		isCreateForm = false,
		canEdit = false,
		reordering = false,
		removingGuid = null,
		createForm = $bindable(null),
		newTitle = $bindable(''),
		newValue = $bindable(''),
		newDescription = $bindable(''),
		newFilterLabel = $bindable(''),
		newIcon = $bindable(''),
		formError = '',
		creating = false,
		overlayHref = '',
		onAdd = () => {},
		onRemove = () => {},
		onSubmit = () => {}
	}: Props = $props();

	let valueTouched = $state(false);
	let lastAutoValue = $state('');

	function slugify(source: string) {
		return source
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_.-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	let nextSlug = $derived.by(() => slugify(newTitle));

	$effect(() => {
		if (!newTitle && !newValue) {
			valueTouched = false;
			lastAutoValue = '';
			return;
		}
		if (valueTouched) {
			return;
		}
		if (newValue && newValue !== lastAutoValue) {
			valueTouched = true;
			return;
		}
		newValue = nextSlug;
		lastAutoValue = nextSlug;
	});
</script>

<li
	class="category-terms__item details-section"
	class:category-terms__item--draggable={canEdit && !isShadow && !isCreateForm}
	class:category-terms__item--placeholder={isShadow}
>
	{#if isCreateForm}
		<form class="category-terms__form" onsubmit={onSubmit} bind:this={createForm}>
			<h3>{$_('category.terms.create_title')}</h3>

			<EditablePlainText editable required label={$_('title')} bind:value={newTitle} />

			<EditablePlainText
				editable
				required
				label={$_('category.terms.value_label')}
				bind:value={newValue}
			/>

			<EditablePlainText
				editable
				label={$_('category.terms.filter_label')}
				bind:value={newFilterLabel}
			/>

			<EditableImage
				editable
				allowedFileTypes={['image/svg+xml']}
				help={$_('upload.image.svg_only_help')}
				label={$_('category.terms.icon')}
				bind:value={newIcon}
			/>

			<div class="category-terms__formatted">
				<EditableFormattedText editable label={$_('description')} bind:value={newDescription} />
			</div>

			{#if formError}
				<p class="category-terms__error">{formError}</p>
			{/if}

			<button class="button button-primary" type="submit" disabled={creating}>
				{$_('category.terms.create_button')}
			</button>
		</form>
	{:else if term && !isShadow}
		{#if canEdit}
			<div
				class="actions is-visible-on-hover category-terms__actions category-terms__actions--left"
			>
				<button
					type="button"
					class="category-terms__add-button"
					onclick={() => onAdd(term.guid)}
					aria-label={$_('category.terms.create_button')}
				>
					<Plus />
				</button>
				<span class="drag-handle" use:dragHandle>
					<DragHandle />
				</span>
			</div>
			<CategoryTermMenu
				disabled={removingGuid === term.guid || reordering}
				onRemove={() => onRemove(term)}
			/>
		{/if}
		<a class="category-terms__content" href={overlayHref}>
			<h3 class="details-heading">
				{#if term.payload.icon}
					<img src={transformFileURL(term.payload.icon)} alt="" class="category-terms__icon" />
				{/if}
				{term.payload.title}
			</h3>
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

<style>
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

	:global(#dnd-action-dragged-el) {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		box-sizing: border-box;
		text-align: left;
	}

	.category-terms__content,
	:global(#dnd-action-dragged-el .category-terms__content) {
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-decoration: none;
	}

	.category-terms__item :global(.details-heading),
	:global(#dnd-action-dragged-el .details-heading) {
		color: var(--color-gray-800);
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.category-terms__icon,
	:global(#dnd-action-dragged-el .category-terms__icon) {
		height: 1.4rem;
		width: 1.4rem;
		object-fit: contain;
		margin-right: 0.15rem;
	}

	:global(#dnd-action-dragged-el .details-heading) {
		align-self: flex-start;
		text-align: left;
	}

	.category-terms__placeholder-hint {
		font-size: 1.25rem;
		letter-spacing: 0.25rem;
	}

	.category-terms__content:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 3px;
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
		left: -3.5rem;
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

	.category-terms__error {
		color: var(--color-red-600);
		margin: 0;
	}

	.category-terms__form {
		background: white;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.category-terms__form h3 {
		margin: 0;
	}

	.category-terms__formatted :global(.details-section) {
		padding-left: 0;
		padding-right: 0;
	}

	@media (hover: hover) {
		.category-terms__item:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}
</style>
