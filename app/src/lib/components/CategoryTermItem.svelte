<script lang="ts">
	import Plus from '~icons/knotdots/plus';
	import { _ } from 'svelte-i18n';
	import CategoryTermMenu from '$lib/components/CategoryTermMenu.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import DraggableActionBar from '$lib/components/DraggableActionBar.svelte';
	import transformFileURL from '$lib/transformFileURL';
	import type { TermContainer } from '$lib/models';

	interface Props {
		term?: TermContainer;
		isShadow?: boolean;
		isCreateForm?: boolean;
		canEdit?: boolean;
		reordering?: boolean;
		removingGuid?: string | null;
		formState?: {
			title: string;
			value: string;
			description: string;
			filterLabel: string;
			icon: string;
			error: string;
			creating: boolean;
			form: HTMLFormElement | null;
		};
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
		formState = $bindable({
			title: '',
			value: '',
			description: '',
			filterLabel: '',
			icon: '',
			error: '',
			creating: false,
			form: null
		}),
		overlayHref = '',
		onAdd = () => {},
		onRemove = () => {},
		onSubmit = () => {}
	}: Props = $props();
</script>

<li class="category-terms__item details-section" class:category-terms__item--placeholder={isShadow}>
	{#if isCreateForm}
		<form class="category-terms__form" onsubmit={onSubmit} bind:this={formState.form}>
			<h3>{$_('category.terms.create_title')}</h3>

			<div class="category-terms__header category-terms__header--small-logo">
				<EditableLogo editable allowedFileTypes={['image/svg+xml']} bind:value={formState.icon} />
				<h1
					class="category-terms__title-input"
					contenteditable="plaintext-only"
					bind:textContent={formState.title}
					data-placeholder={$_('title')}
					aria-label={$_('title')}
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				></h1>
			</div>

			<EditablePlainText
				editable
				label={$_('category.terms.filter_label')}
				bind:value={formState.filterLabel}
			/>

			<div class="category-terms__formatted">
				<EditableFormattedText
					editable
					label={$_('description')}
					bind:value={formState.description}
				/>
			</div>

			{#if formState.error}
				<p class="category-terms__error">{formState.error}</p>
			{/if}

			<button class="button button-primary" type="submit" disabled={formState.creating}>
				{$_('category.terms.create_button')}
			</button>
		</form>
	{:else if term && !isShadow}
		{#if canEdit}
			<DraggableActionBar className="category-terms__actions">
				{#snippet actions()}
					<div class="dropdown dropdown--compact">
						<button
							type="button"
							class="dropdown-button"
							onclick={() => onAdd(term.guid)}
							aria-label={$_('category.terms.create_button')}
						>
							<Plus />
							<span class="is-visually-hidden">{$_('add_section')}</span>
						</button>
					</div>
				{/snippet}
			</DraggableActionBar>
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
	:global(.category-terms__actions) {
		--actions-left: -3.5rem;
		--actions-top: 0.5rem;
	}

	.category-terms__content {
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-decoration: none;
	}

	.category-terms__content:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 3px;
	}

	.category-terms__description {
		color: var(--color-gray-700);
		margin: 0;
	}

	.category-terms__error {
		color: var(--color-red-600);
		margin: 0;
	}

	.category-terms__formatted :global(.details-section) {
		padding-left: 0;
		padding-right: 0;
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

	.category-terms__icon {
		height: 1.4rem;
		width: 1.4rem;
		object-fit: contain;
		margin-right: 0.15rem;
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

	.category-terms__item :global(.details-heading) {
		color: var(--color-gray-800);
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.category-terms__item--placeholder {
		align-items: center;
		background: transparent;
		border: 1px dashed var(--color-gray-300);
		color: var(--color-gray-400);
		justify-content: center;
		min-height: 3.25rem;
	}

	.category-terms__item:hover {
		box-shadow: var(--shadow-sm);
	}

	.category-terms__header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.category-terms__header--small-logo {
		--logo-height: 2.25rem;
	}

	.category-terms__title-input {
		flex-grow: 1;
		margin: 0;
		min-height: 2.5rem;
	}

	.category-terms__title-input:empty::before {
		color: var(--color-gray-400);
		content: attr(data-placeholder);
	}

	.category-terms__placeholder-hint {
		font-size: 1.25rem;
		letter-spacing: 0.25rem;
	}

	.dropdown.dropdown--compact {
		--dropdown-button-border-radius: 4px;
		--dropdown-button-padding: 0.25rem;
	}

	@media (hover: hover) {
		.category-terms__item:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}
</style>
