<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import ChevronRight from '~icons/knotdots/chevron-right';
	import Link from '~icons/knotdots/link';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import MultilevelSettingsDropdown from '$lib/components/MultilevelSettingsDropdown.svelte';
	import type { AnyContainer } from '$lib/models';
	import { applicationState, mayDeleteContainer, overlayHistory } from '$lib/stores';

	type SettingsSubview = 'main' | 'embed';

	interface Props {
		container: AnyContainer;
		relatedContainers?: AnyContainer[];
	}

	let { container, relatedContainers = [] }: Props = $props();

	let settingsSubview = $state<SettingsSubview>('main');
	let codeVisible = $state(true);
	let copied = $state(false);

	let confirmDeleteDialog: HTMLDialogElement = $state(undefined!);

	let showCode = $derived(codeVisible);

	let embedPath = $derived(`/${container.organization}/${container.guid}/embed`);
	let containerTitle = $derived(
		'title' in container.payload ? container.payload.title : container.payload.name
	);

	let embedCode = $derived.by(() => {
		const url = typeof window === 'undefined' ? embedPath : `${window.location.origin}${embedPath}`;
		const escapedTitle = containerTitle.replaceAll('"', '&quot;');
		return `<!-- knot-dots Embed -->\n<iframe\n  src="${url}"\n  width="100%"\n  min-height="1200"\n  frameborder="0"\n  title="${escapedTitle}"\n  loading="lazy">\n</iframe>`;
	});

	function openSubview(view: SettingsSubview) {
		settingsSubview = view;
	}

	function resetSettingsState() {
		settingsSubview = 'main';
		codeVisible = true;
	}

	function backToMain() {
		settingsSubview = 'main';
	}

	async function copyEmbedCode() {
		if (typeof navigator === 'undefined' || !navigator.clipboard) {
			return;
		}

		await navigator.clipboard.writeText(embedCode);
		copied = true;

		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	async function handleDelete() {
		const response = await deleteContainer(container);
		if (response.ok) {
			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
				window.location.hash = newParams.toString();
			} else {
				window.location.hash = '';
			}
		}
		confirmDeleteDialog.close();
	}
</script>

<MultilevelSettingsDropdown
	isRoot={settingsSubview === 'main'}
	label={$_('container_settings_dropdown.title')}
	handleBack={backToMain}
	handleClose={resetSettingsState}
	handleOpen={resetSettingsState}
	panelMinWidth="17.5rem"
	title={settingsSubview === 'main'
		? $_('container_settings_dropdown.title')
		: $_('embed.menu_item_title')}
>
	{#snippet children(closeDropdown)}
		{#if settingsSubview === 'main'}
			<button class="settings-item" onclick={() => openSubview('embed')} type="button">
				<Link />
				<span>
					<strong>{$_('embed.menu_item_title')}</strong>
					<small>{$_('embed.menu_item_subtitle')}</small>
				</span>
				<ChevronRight />
			</button>

			{#if $applicationState.containerDetailView.editable && $mayDeleteContainer(container)}
				<div class="settings-divider" role="presentation"></div>
				<button
					class="settings-item settings-item--danger"
					onclick={() => {
						closeDropdown();
						confirmDeleteDialog.showModal();
					}}
					type="button"
				>
					<TrashBin />
					<span>
						<strong>{$_('delete')}</strong>
					</span>
				</button>
			{/if}
		{:else}
			<div class="embed-content">
				<p class="embed-description">{$_('embed.menu_item_subtitle')}</p>
				<button class="button button-xs copy-button" onclick={copyEmbedCode} type="button">
					{#if copied}
						{$_('embed.copied')}
					{:else}
						{$_('embed.copy_code')}
					{/if}
				</button>

				<div class="code-box">
					<button class="code-toggle" onclick={() => (codeVisible = !codeVisible)} type="button">
						<span class="code-toggle-icon" class:rotated={!codeVisible}>
							<ChevronDown />
						</span>
						<span>{$_('embed.show_code')}</span>
					</button>
					{#if showCode}
						<pre>{embedCode}</pre>
					{/if}
				</div>
			</div>
		{/if}
	{/snippet}
</MultilevelSettingsDropdown>

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	{container}
	handleSubmit={handleDelete}
	{relatedContainers}
/>

<style>
	.settings-item {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: var(--color-gray-700);
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: left;
		width: 100%;
	}

	.settings-item:hover {
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

	.settings-divider {
		border-top: solid 1px var(--color-gray-200);
		margin: 0.375rem 0;
	}

	.embed-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.embed-description {
		color: var(--color-gray-700);
		font-size: 0.75rem;
		line-height: 1.5;
		margin: 0;
		padding: 0 0.5rem;
	}

	.copy-button {
		--button-background: var(--color-white);
		--button-hover-background: var(--color-gray-100);
		--button-active-background: var(--color-gray-200);

		border: 1px solid var(--color-gray-200);
		justify-content: center;
		width: 100%;
	}

	.code-box {
		background: var(--color-gray-050);
		border: 1px solid var(--color-gray-200);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.code-toggle {
		align-items: center;
		background: transparent;
		border: none;
		color: var(--color-gray-700);
		display: flex;
		font-size: 0.75rem;
		font-weight: 500;
		gap: 0.5rem;
		padding: 0.5rem;
		width: 100%;
	}

	.code-toggle-icon {
		display: inline-flex;
	}

	.code-toggle-icon > :global(svg) {
		height: 0.75rem;
		transition: transform 0.2s ease;
		width: 0.75rem;
	}

	.code-toggle-icon.rotated > :global(svg) {
		transform: rotate(-90deg);
	}

	pre {
		color: var(--color-gray-600);
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		margin: 0;
		max-width: 100%;
		overflow-x: auto;
		overflow-wrap: anywhere;
		padding: 0 0.5rem 0.5rem;
		word-break: break-word;
		white-space: pre-wrap;
	}
</style>
