<script lang="ts">
	import type { Component } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { _ } from 'svelte-i18n';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import Plus from '~icons/knotdots/plus';
	import ChevronRight from '~icons/knotdots/chevron-right';
	import Link from '~icons/knotdots/link';
	import Text from '~icons/knotdots/text';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { type AnyContainer, isTeaserLikeContainer, type TeaserLikeContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		ondelete?: () => Promise<void>;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
		payloadSuffix?: '' | 'Right';
	}

	let {
		container = $bindable(),
		ondelete,
		parentContainer = $bindable(),
		relatedContainers = $bindable(),
		payloadSuffix = $bindable('')
	}: Props = $props();

	let popover = createPopover({ label: $_('settings') });

	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'fixed'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	let teaserContainer = $derived(isTeaserLikeContainer(container) ? container : null);

	async function handleDelete(container: AnyContainer) {
		const response = await deleteContainer(container);

		if (response.ok) {
			parentContainer.relation = parentContainer.relation.filter(
				({ subject }) => subject !== container.guid
			);
			relatedContainers = relatedContainers.filter(({ guid }) => guid !== container.guid);
		}

		if (ondelete) {
			await ondelete();
		}

		dialog.close();
	}

	/**
	 * Helper to get a typed reference to a boolean field in the payload
	 */
	function getBooleanField(key: 'titleEnable' | 'textEnable' | 'imageEnable' | 'linkEnable') {
		if (!teaserContainer) return null;
		const pKey = (
			payloadSuffix === 'Right' ? `${key}Right` : key
		) as keyof TeaserLikeContainer['payload'];
		// We return the actual object and the specific key to allow binding
		return { payload: teaserContainer.payload, key: pKey };
	}
</script>

{#snippet SubMenu(
	label: string,
	Icon: Component<SvelteHTMLElements['svg']>,
	children: import('svelte').Snippet
)}
	{@const [subTrigger, subContent] = createPopperActions({
		placement: 'right-start',
		strategy: 'fixed',
		modifiers: [{ name: 'offset', options: { offset: [-24, -1] } }]
	})}
	<div class="menu-item menu-item--has-sub" use:subTrigger>
		<button type="button" style="align-items: center">
			{#if Icon}
				<Icon style="height: 16px; width: 18px;" />
			{/if}
			<span class="truncated">{label}</span>
			<ChevronRight style="height: 12px; width: 12px; margin-left: auto;" />
		</button>

		<div class="dropdown-panel dropdown-panel--sub" use:subContent>
			<div class="sub-menu-content">
				{@render children()}
			</div>
		</div>
	</div>
{/snippet}

{#if $ability.can('update', container, 'visibility') || $ability.can('delete', container)}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" use:popover.button>
			<Plus />
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				<div class="dropdown-panel-scroll-wrapper">
					{#if $ability.can('update', container, 'visibility')}
						<!-- Group: Text -->
						<p class="dropdown-panel-group-title">Text</p>
						{@render CheckboxItem('titleEnable', 'Titel einblenden')}
						{@render CheckboxItem('textEnable', 'Text einblenden')}

						<!-- Group: Bild -->
						<p class="dropdown-panel-group-title">Bild</p>
						{@render CheckboxItem('imageEnable', 'Bild einblenden')}
						{@render SubMenu('Alt-Text', Text, AltTextSub)}

						<!-- Group: Link -->
						<p class="dropdown-panel-group-title">Link</p>
						{@render CheckboxItem('linkEnable', 'Link einblenden')}
						{@render SubMenu('Link URL', Link, LinkUrlSub)}
						{@render SubMenu('Link Text', Text, LinkTextSub)}
					{/if}
				</div>
			</fieldset>
		{/if}
	</div>

	<ConfirmDeleteDialog
		bind:dialog
		{container}
		handleSubmit={() => handleDelete(container)}
		{relatedContainers}
	/>
{/if}

{#snippet CheckboxItem(
	key: 'titleEnable' | 'textEnable' | 'imageEnable' | 'linkEnable',
	label: string
)}
	{@const field = getBooleanField(key)}

	{#if field}
		<label class="menu-label-item">
			<input
				name={String(field.key)}
				bind:checked={field.payload[field.key] as boolean}
				type="checkbox"
			/>
			<span class="truncated">{label}</span>
		</label>
	{/if}
{/snippet}

{#snippet AltTextSub()}
	{#if teaserContainer}
		{@const payloadKey = (
			payloadSuffix === 'Right' ? 'imageAltTextRight' : 'imageAltText'
		) as keyof typeof teaserContainer.payload}

		<label class="input-group">
			<span>Alt-Text eingeben</span>
			<input
				bind:value={teaserContainer.payload[payloadKey] as string}
				name={String(payloadKey)}
				type="text"
				placeholder="z.B. Beschreibung des Bildes..."
			/>
		</label>
	{/if}
{/snippet}

{#snippet LinkUrlSub()}
	{#if teaserContainer}
		{@const payloadKey = (
			payloadSuffix === 'Right' ? 'linkRight' : 'link'
		) as keyof typeof teaserContainer.payload}
		<label class="input-group">
			<span>URL</span>
			<input
				bind:value={teaserContainer.payload[payloadKey] as string}
				name={String(payloadKey)}
				type="url"
				placeholder="https://..."
			/>
		</label>
	{/if}
{/snippet}

{#snippet LinkTextSub()}
	{#if teaserContainer}
		{@const payloadKey = (
			payloadSuffix === 'Right' ? 'linkCaptionRight' : 'linkCaption'
		) as keyof typeof teaserContainer.payload}
		<label class="input-group">
			<span>Anzeigetext</span>
			<input
				bind:value={teaserContainer.payload[payloadKey] as string}
				name={String(payloadKey)}
				type="text"
				placeholder="Link Text..."
			/>
		</label>
	{/if}
{/snippet}

<style>
	.dropdown-panel {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 16px;
		box-shadow: var(--shadow-lg);
		overflow: visible !important;
		z-index: 50;
	}

	.dropdown-panel-scroll-wrapper {
		max-height: 400px;
		overflow-x: visible;
		overflow-y: auto;
		padding: 0.25rem 0;
	}

	/* Menu Item Styling */
	.menu-label-item {
		align-items: center;
		cursor: pointer;
		display: flex;
		font-size: 0.875rem;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
	}

	.menu-label-item:hover {
		background-color: var(--color-gray-50);
	}

	/* Sub Menu Specifics */
	.dropdown-panel--sub {
		min-width: 220px;
		z-index: 100;
		visibility: hidden;
		transition: visibility 0s 0.5s;
	}

	.menu-item--has-sub:hover > .dropdown-panel--sub {
		transition: var(--is-visible-on-hover-transition, visibility 0s 0.5s linear);
		visibility: var(--is-visible-on-hover-visibility, visible);
	}

	.sub-menu-content {
		padding: 0.75rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input-group span {
		color: var(--color-gray-700);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.input-group input {
		border: 1px solid var(--color-gray-300);
		border-radius: 5px;
		font-size: 0.875rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
	}
	.menu-item > button {
		color: var(--color-gray-500);
		font-weight: 500;
		font-size: 0.875rem;
	}
	.dropdown-panel-title {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.5rem 0.75rem;
	}
	.dropdown-panel-group-title {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem 0.75rem;
	}
</style>
