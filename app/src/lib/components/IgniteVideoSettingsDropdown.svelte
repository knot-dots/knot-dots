<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Eye from '~icons/flowbite/eye-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import ChevronRight from '~icons/knotdots/chevron-right';
	import Video from '~icons/knotdots/video';
	import requestSubmit from '$lib/client/requestSubmit';
	import deleteContainer from '$lib/client/deleteContainer';
	import CascadingMenu from '$lib/components/CascadingMenu.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import type { AnyPayload, Container, IgniteVideoPayload } from '$lib/models';
	import { ability } from '$lib/stores';
	import visibilityOptions from '$lib/visibilityOptions.svelte';

	interface Props {
		container: Container<IgniteVideoPayload>;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let iframeUrl = $state(container.payload.iframeUrl ?? '');
	let dialog: HTMLDialogElement;

	const mayUpdateVisibility = $derived($ability.can('update', container, 'payload.visibility'));
	const mayUpdateContainer = $derived($ability.can('update', container));
	const mayDelete = $derived($ability.can('delete', container));
	const mayShowDropdown = $derived(mayUpdateVisibility || mayUpdateContainer || mayDelete);

	function handleInputIframeUrl(event: Event & { currentTarget: HTMLInputElement }) {
		event.stopPropagation();

		if (event.currentTarget.validity.valid) {
			iframeUrl = event.currentTarget.value;
		}
	}

	function handleEmbed(event: MouseEvent, closeMenu: () => void) {
		container.payload.iframeUrl = iframeUrl;
		requestSubmit(event);
		closeMenu();
	}

	async function handleDelete() {
		const response = await deleteContainer(container);

		if (response.ok) {
			parentContainer.relation = parentContainer.relation.filter(
				({ subject }) => subject !== container.guid
			);
			relatedContainers = relatedContainers.filter(({ guid }) => guid !== container.guid);
		}

		dialog.close();
	}
</script>

{#if mayShowDropdown}
	<CascadingMenu title={$_('container_settings_dropdown.title')}>
		{#snippet children(openSubMenuTitle, openSubMenu, closeMenu)}
			{#if openSubMenuTitle === ''}
				{#if mayUpdateVisibility}
					<button
						class="cascading-menu-item"
						onclick={() => openSubMenu($_('container_settings_dropdown.visibility.title'))}
						type="button"
					>
						<Eye />
						<span>
							<strong>{$_('container_settings_dropdown.visibility.title')}</strong>
							<small>{$_(`visibility.${container.payload.visibility}`)}</small>
						</span>
						<ChevronRight />
					</button>
				{/if}

				{#if mayUpdateContainer}
					<button
						class="cascading-menu-item"
						onclick={() => openSubMenu($_('ignite_video.settings.link'))}
						type="button"
					>
						<Video />
						<span>
							<strong>{$_('ignite_video.settings.link')}</strong>
						</span>
						<ChevronRight />
					</button>
				{/if}

				{#if mayDelete}
					<div class="divider" role="presentation"></div>
					<button
						class="cascading-menu-item danger"
						onclick={() => {
							closeMenu();
							dialog.showModal();
						}}
						type="button"
					>
						<TrashBin />
						<span>
							<strong>{$_('container_settings_dropdown.delete.title')}</strong>
						</span>
					</button>
				{/if}
			{:else if openSubMenuTitle === $_('container_settings_dropdown.visibility.title')}
				{#each visibilityOptions(container, relatedContainers) as option (option.value)}
					<label class="choice" class:is-selected={container.payload.visibility === option.value}>
						<input
							type="radio"
							name="visibility"
							value={option.value}
							bind:group={container.payload.visibility}
						/>
						<span>{option.label}</span>
					</label>
				{/each}
			{:else if openSubMenuTitle === $_('ignite_video.settings.link')}
				{@const id = crypto.randomUUID()}
				<div class="link-content" oninput={(event) => event.stopPropagation()}>
					<label class="is-visually-hidden" for={id}>
						{$_('ignite_video.placeholder')}
					</label>
					<input
						{id}
						oninput={handleInputIframeUrl}
						pattern="https:\/\/play\.ignite\.video\/player\/index\.html\?id=.+"
						placeholder={$_('ignite_video.placeholder')}
						required
						type="url"
						value={container.payload.iframeUrl}
					/>
					<button
						class="button-primary system-primary"
						disabled={!iframeUrl || iframeUrl === container.payload.iframeUrl}
						type="button"
						onclick={(event) => handleEmbed(event, closeMenu)}
					>
						{$_('ignite_video.embed')}
					</button>
					<p class="hint">{$_('ignite_video.url_help')}</p>
				</div>
			{/if}
		{/snippet}
	</CascadingMenu>

	<ConfirmDeleteDialog bind:dialog {container} handleSubmit={handleDelete} {relatedContainers} />
{/if}

<style>
	.cascading-menu-item,
	.choice {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: var(--color-gray-700);
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: left;
		width: 100%;
	}

	.cascading-menu-item:hover,
	.choice:hover,
	.choice.is-selected {
		background-color: var(--color-gray-100);
	}

	.cascading-menu-item > :global(svg:first-child) {
		color: var(--color-gray-700);
		height: 1rem;
		width: 1rem;
	}

	.cascading-menu-item > span {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.cascading-menu-item strong {
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1;
	}

	.cascading-menu-item small {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.cascading-menu-item > :global(svg:last-child) {
		color: var(--color-gray-400);
		height: 0.75rem;
		margin-left: auto;
		width: 0.75rem;
	}

	.danger > :global(svg:first-child),
	.danger strong {
		color: var(--color-gray-700);
	}

	.divider {
		border-top: solid 1px var(--color-gray-200);
		margin: 0.375rem 0;
	}

	.choice input {
		margin: 0;
	}

	.link-content {
		align-items: stretch;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.hint {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.5;
		margin: 0;
		text-align: center;
		width: 100%;
	}
</style>
