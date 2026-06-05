<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Eye from '~icons/flowbite/eye-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import ChevronRight from '~icons/knotdots/chevron-right';
	import ExclamationCircle from '~icons/knotdots/exclamation-circle';
	import Video from '~icons/knotdots/video';
	import { env } from '$env/dynamic/public';
	import requestSubmit from '$lib/client/requestSubmit';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import MultilevelSettingsDropdown from '$lib/components/MultilevelSettingsDropdown.svelte';
	import { igniteVideoURL } from '$lib/igniteVideo';
	import type { AnyContainer, IgniteVideoContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import visibilityOptions from '$lib/visibilityOptions.svelte';

	type SettingsSubview = 'main' | 'visibility' | 'link';

	interface Props {
		container: IgniteVideoContainer;
		hasValidVideo: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		hasValidVideo,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let settingsSubview = $state<SettingsSubview>('main');
	let urlInput = $state('');
	let dialog: HTMLDialogElement = $state(undefined!);

	const mayUpdateVisibility = $derived($ability.can('update', container, 'payload.visibility'));
	const mayUpdateContainer = $derived($ability.can('update', container));
	const mayDelete = $derived($ability.can('delete', container));
	const mayShowDropdown = $derived(
		mayUpdateVisibility || (hasValidVideo && mayUpdateContainer) || mayDelete
	);
	const urlInputValid = $derived(
		Boolean(igniteVideoURL(urlInput, env.PUBLIC_IGNITE_VIDEO_ALLOWED_ORIGINS))
	);
	const hasInvalidUrl = $derived(!urlInputValid && urlInput.trim() !== '');

	function openSubview(view: SettingsSubview) {
		settingsSubview = view;
		if (view === 'link') {
			urlInput = container.payload.iframeUrl ?? '';
		}
	}

	function resetSettingsState() {
		settingsSubview = 'main';
		urlInput = '';
	}

	function backToMain() {
		settingsSubview = 'main';
	}

	function handleEmbed(event: MouseEvent, closeDropdown: () => void) {
		if (!urlInputValid) {
			return;
		}

		container.payload.iframeUrl = urlInput.trim();
		requestSubmit(event);
		closeDropdown();
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
	<MultilevelSettingsDropdown
		isRoot={settingsSubview === 'main'}
		label={$_('container_settings_dropdown.title')}
		handleBack={backToMain}
		handleClose={resetSettingsState}
		handleOpen={resetSettingsState}
		panelMinWidth="15rem"
		title={settingsSubview === 'main'
			? $_('container_settings_dropdown.title')
			: settingsSubview === 'visibility'
				? $_('container_settings_dropdown.visibility.title')
				: $_('ignite_video.settings.link')}
	>
		{#snippet children(closeDropdown)}
			{#if settingsSubview === 'main'}
				{#if mayUpdateVisibility}
					<button class="settings-item" onclick={() => openSubview('visibility')} type="button">
						<Eye />
						<span>
							<strong>{$_('container_settings_dropdown.visibility.title')}</strong>
							<small>{$_(`visibility.${container.payload.visibility}`)}</small>
						</span>
						<ChevronRight />
					</button>
				{/if}

				{#if hasValidVideo && mayUpdateContainer}
					<button class="settings-item" onclick={() => openSubview('link')} type="button">
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
						class="settings-item danger"
						onclick={() => {
							closeDropdown();
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
			{:else if settingsSubview === 'visibility'}
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
			{:else}
				<div class="link-content" oninput={(event) => event.stopPropagation()}>
					<div class="input-row" class:invalid={hasInvalidUrl}>
						<input
							aria-invalid={hasInvalidUrl}
							placeholder={$_('ignite_video.placeholder')}
							type="url"
							bind:value={urlInput}
						/>
						{#if hasInvalidUrl}
							<span class="error-label">
								{$_('ignite_video.unsupported')}
								<ExclamationCircle />
							</span>
						{/if}
					</div>
					<button
						class="embed-button"
						disabled={!urlInputValid}
						type="button"
						onclick={(event) => handleEmbed(event, closeDropdown)}
					>
						{$_('ignite_video.embed')}
					</button>
					<p class="hint">{$_('ignite_video.url_help')}</p>
				</div>
			{/if}
		{/snippet}
	</MultilevelSettingsDropdown>

	<ConfirmDeleteDialog bind:dialog {container} handleSubmit={handleDelete} {relatedContainers} />
{/if}

<style>
	.settings-item,
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

	.settings-item:hover,
	.choice:hover,
	.choice.is-selected {
		background-color: var(--color-gray-100);
	}

	.settings-item > :global(svg:first-child) {
		color: var(--color-gray-700);
		height: 1rem;
		width: 1rem;
	}

	.settings-item > span {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.settings-item strong {
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1;
	}

	.settings-item small {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.settings-item > :global(svg:last-child) {
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

	.input-row {
		align-items: center;
		background: var(--color-gray-050);
		border: 1px solid var(--color-gray-200);
		border-radius: 4px;
		display: flex;
		gap: 0.5rem;
		min-height: 2.25rem;
		padding: 0.375rem;
		width: 100%;
	}

	.input-row.invalid {
		background: var(--color-red-050);
		border-color: var(--color-red-200);
	}

	.input-row input {
		background: transparent;
		border: 0;
		color: var(--color-gray-900);
		flex: 1 1 auto;
		font: inherit;
		min-width: 0;
		outline: none;
		padding: 0 0.125rem;
		width: 100%;
	}

	.input-row input::placeholder {
		color: var(--color-gray-500);
	}

	.input-row.invalid input {
		color: var(--color-red-500);
	}

	.error-label {
		align-items: center;
		color: var(--color-red-700);
		display: flex;
		flex: 0 0 auto;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.125rem;
		line-height: 1.5;
		white-space: nowrap;
	}

	.error-label :global(svg) {
		color: var(--color-red-700);
		flex: 0 0 auto;
		height: 1.25rem;
		width: 1.25rem;
	}

	.embed-button {
		align-items: center;
		background: var(--color-primary-700);
		border: 0;
		border-radius: 8px;
		color: white;
		display: flex;
		font-size: 0.75rem;
		font-weight: 500;
		justify-content: center;
		line-height: 1.5;
		min-height: 2.25rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
	}

	.embed-button:disabled {
		background: var(--color-gray-300);
		opacity: 1;
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
