<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import CategoryTermMenu from '$lib/components/CategoryTermMenu.svelte';
	import DraggableActionBar from '$lib/components/DraggableActionBar.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import { overlayKey, overlayURL, type TermContainer } from '$lib/models';
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
			creating: boolean;
		};
		onAdd?: () => void;
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
		onAdd = () => {},
		onRemove = () => {},
		onSubmit = () => {}
	}: Props = $props();

	const idForTitle = crypto.randomUUID();

	const overlayHref = $derived(term ? overlayURL(page.url, overlayKey.enum.view, term.guid) : '');

	const init: Attachment<HTMLTextAreaElement> = (element) => {
		element.focus();
		element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	};
</script>

<li>
	{#if isCreateForm}
		<form class="details-section" onsubmit={onSubmit}>
			<header>
				<EditableLogo editable allowedFileTypes={['image/svg+xml']} bind:value={formState.icon} />

				<h2 class="details-heading">
					<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
					<AutoresizingTextarea
						{@attach init}
						bind:value={formState.title}
						id={idForTitle}
						oninput={(e) => {
							if (e.currentTarget.value.trim().length === 0) {
								e.currentTarget.setCustomValidity($_('category.terms.required'));
							} else {
								e.currentTarget.setCustomValidity('');
							}
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
							}
						}}
						placeholder={$_('title')}
						required
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
								onclick={onAdd}
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

	.dropdown.dropdown--compact {
		--dropdown-button-border-radius: 4px;
		--dropdown-button-padding: 0.25rem;
	}

	.details-section {
		border: solid 1px var(--color-gray-200);
		position: relative;
		margin-bottom: 1rem;
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
