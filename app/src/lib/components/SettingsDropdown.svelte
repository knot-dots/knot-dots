<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import Link from '~icons/knotdots/link';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import deleteContainer from '$lib/client/deleteContainer';
	import CascadingMenu from '$lib/components/CascadingMenu.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { type AnyPayload, type Container, getContextIdentifier, visibility } from '$lib/models';
	import { applicationState, mayDeleteContainer, overlayHistory } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
		relatedContainers?: Container<AnyPayload>[];
	}

	let { container, relatedContainers = [] }: Props = $props();

	let codeVisible = $state(true);
	let copied = $state(false);

	let confirmDeleteDialog: HTMLDialogElement = $state(undefined!);

	let showCode = $derived(codeVisible);

	let embedOrganizationIdentifier = $derived.by(() => {
		const context = container.organizational_unit
			? page.data.organizationalUnits?.find(
					({ guid }: { guid: string }) => guid === container.organizational_unit
				)
			: page.data.organizations?.find(
					({ guid }: { guid: string }) => guid === container.organization
				);
		return context
			? getContextIdentifier(context)
			: (container.organizational_unit ?? container.organization);
	});

	let embedPath = $derived(`/${embedOrganizationIdentifier}/${container.guid}/embed`);

	let containerTitle = $derived(
		'title' in container.payload ? container.payload.title : container.payload.name
	);

	let embedCode = $derived.by(() => {
		const url = typeof window === 'undefined' ? embedPath : `${window.location.origin}${embedPath}`;
		const escapedTitle = containerTitle.replaceAll('"', '&quot;');
		return `<!-- knot-dots Embed -->\n<iframe\n  src="${url}"\n  style="width: 100%; height: clamp(700px, 85vh, 1400px); border: 0;"\n  title="${escapedTitle}"\n  loading="lazy">\n</iframe>`;
	});

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
				await goto(`#${newParams.toString()}`, { invalidateAll: true });
			} else {
				await goto('#', { invalidateAll: true });
			}
		} else {
			const error = await response.json();
			alert(error.message);
		}
		confirmDeleteDialog.close();
	}
</script>

{#if container.payload.visibility === visibility.enum.public}
	<CascadingMenu title={$_('container_settings_dropdown.title')}>
		{#snippet children(openSubMenuTitle, openSubMenu, closeMenu)}
			{#if openSubMenuTitle === ''}
				<button
					class="cascading-menu-item"
					onclick={() => openSubMenu($_('embed.menu_item_title'))}
					type="button"
				>
					<Link />
					<span>
						<strong>{$_('embed.menu_item_title')}</strong>
						<small>{$_('embed.menu_item_subtitle')}</small>
					</span>
					<ChevronRight />
				</button>

				{#if $applicationState.containerDetailView.editable && $mayDeleteContainer(container)}
					<div class="cascading-menu-divider" role="presentation"></div>
					<button
						class="cascading-menu-item system-danger"
						onclick={() => {
							closeMenu();
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
			{:else if openSubMenuTitle === $_('embed.menu_item_title')}
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
	</CascadingMenu>
{/if}

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	{container}
	handleSubmit={handleDelete}
	{relatedContainers}
/>

<style>
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
