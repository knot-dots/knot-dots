<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import CategoryTermMenu from '$lib/components/CategoryTermMenu.svelte';
	import DraggableActionBar from '$lib/components/DraggableActionBar.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import type { TermContainer } from '$lib/models';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		term?: TermContainer;
		isCreateForm?: boolean;
		canEdit?: boolean;
		reordering?: boolean;
		removingGuid?: string | null;
		formState: {
			title: string;
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
		isCreateForm = false,
		canEdit = false,
		reordering = false,
		removingGuid = null,
		formState = $bindable(),
		overlayHref = '',
		onAdd = () => {},
		onRemove = () => {},
		onSubmit = () => {}
	}: Props = $props();

	const idForTitle = crypto.randomUUID();
</script>

<li>
	{#if isCreateForm}
		<form class="details-section" onsubmit={onSubmit} bind:this={formState.form}>
			<header>
				<EditableLogo editable allowedFileTypes={['image/svg+xml']} bind:value={formState.icon} />

				<h2 class="details-heading">
					<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
					<AutoresizingTextarea
						bind:value={formState.title}
						id={idForTitle}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
							}
						}}
						placeholder={$_('title')}
						rows={1}
					/>
				</h2>
			</header>

			<EditablePlainText
				editable
				label={$_('category.terms.filter_label')}
				bind:value={formState.filterLabel}
			/>

			<Editor label={$_('description')} bind:value={formState.description} />

			{#if formState.error}
				<p class="error">{formState.error}</p>
			{/if}

			<button class="button-primary" disabled={formState.creating} type="submit">
				{$_('category.terms.create_button')}
			</button>
		</form>
	{:else if term}
		<div class="details-section">
			{#if canEdit}
				<DraggableActionBar>
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
			{/if}
			<header>
				{#if term.payload.icon}
					<img src={transformFileURL(term.payload.icon)} class="logo" alt="" />
				{/if}

				<h2 class="details-heading">
					<a href={overlayHref}>
						{term.payload.title}
					</a>
				</h2>

				{#if canEdit}
					<CategoryTermMenu
						disabled={removingGuid === term.guid || reordering}
						onRemove={() => onRemove(term)}
					/>
				{/if}
			</header>

			<p>
				{#if term.payload.description}
					{term.payload.description}
				{:else}
					&nbsp;
				{/if}
			</p>
		</div>
	{/if}
</li>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.button-primary {
		width: fit-content;
	}

	.error {
		color: var(--color-red-600);
		margin: 0;
	}

	.dropdown.dropdown--compact {
		--dropdown-button-border-radius: 4px;
		--dropdown-button-padding: 0.25rem;
	}

	.details-section {
		position: relative;
	}

	.details-section > header {
		--logo-height: 2.5rem;

		align-items: start;
		display: flex;
		gap: 0.75rem;
		min-height: var(--logo-height);
	}

	.details-section > header > :global(img:first-child) {
		flex-shrink: 0;
		height: var(--logo-height);
	}

	.details-heading {
		color: var(--color-gray-800);
		font-size: 1.875rem;
		font-weight: 600;
	}

	@media (hover: hover) {
		.details-section:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}
</style>
