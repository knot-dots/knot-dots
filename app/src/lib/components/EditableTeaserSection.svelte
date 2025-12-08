<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { Attachment } from 'svelte/attachments';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import ArrowRight from '~icons/knotdots/arrow-right';
	import ExclamationCircle from '~icons/knotdots/exclamation-circle';
	import {
		type AnyContainer,
		type TeaserContainer,
		type InfoBoxContainer,
		type TeaserHighlightContainer,
		type QuoteContainer,
		isQuoteContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import EditableImageInline from '$lib/components/EditableImageInline.svelte';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import requestSubmit from '$lib/client/requestSubmit';

	interface Props {
		container: TeaserContainer | InfoBoxContainer | TeaserHighlightContainer | QuoteContainer;
		editable?: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const init: Attachment = (element) => {
		if (container.payload.title == '') {
			(element as HTMLElement).focus();
		}
	};

	const cssClassMap: Record<string, string> = {
		teaser: 'teaser',
		info_box: 'info-box',
		teaser_highlight: 'teaser-highlight',
		quote: 'blockquote'
	};

	let cssClass = $derived(cssClassMap[container.payload.type] ?? 'teaser');
	let canUpdate = $derived(editable && $ability.can('update', container));
	let isInfoBox = $derived(container.payload.type === 'info_box');
	let hasLink = $derived(container.payload.link && container.payload.linkCaption);
	let gridClass = $derived(container.payload.image ? 'grid-2-cols grid-66-33' : '');
</script>

<div style="position: relative" class={cssClass}>
	{#if canUpdate}
		<ul class="absolute-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:relatedContainers bind:parentContainer />
			</li>
		</ul>
	{/if}

	<div class={canUpdate ? 'grid-2-cols grid-66-33' : gridClass}>
		<div>
			{#if !isQuoteContainer(container)}
				<header>
					{#if isInfoBox}
						<span style="color: var(--color-orange-500)">
							<ExclamationCircle />
						</span>
					{/if}
					{#if canUpdate}
						<h3
							bind:textContent={container.payload.title}
							class="details-heading"
							contenteditable="plaintext-only"
							onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
							{@attach init}
						></h3>
					{:else}
						<h3 class="details-heading" contenteditable="false">
							{container.payload.title}
						</h3>
					{/if}
				</header>
			{/if}
			<div class="teaser--content">
				{#if canUpdate}
					<Editor bind:value={container.payload.body} />
				{:else}
					<Viewer value={container.payload.body} />
				{/if}
			</div>
		</div>
		<EditableImageInline
			{editable}
			label={$_(canUpdate ? 'upload.image.add' : 'cover')}
			bind:value={container.payload.image}
		/>
	</div>

	{#if !isQuoteContainer(container)}
		<div class="flex mt-3" class:flex-column={!canUpdate}>
			{#if canUpdate}
				<EditablePlainText
					{editable}
					label={$_('teaser.link_caption')}
					bind:value={container.payload.linkCaption}
				/>
				<EditablePlainText
					{editable}
					label={$_('teaser.link')}
					bind:value={container.payload.link}
				/>
			{:else if hasLink}
				<div class="flex-end">
					<a class="button button--action" href={container.payload.link}>
						<ArrowRight /> {container.payload.linkCaption}</a
					>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	header {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.mt-3 {
		margin-top: 1rem;
	}

	.flex {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.flex.flex-column {
		align-items: flex-start;
		flex-direction: column;
	}

	.flex-end {
		align-self: flex-end;
	}

	.info-box h3,
	.teaser-highlight h3 {
		min-height: unset;
	}

	.info-box h3 {
		color: var(--color-yellow-900);
	}

	.teaser-highlight h3 {
		color: var(--color-teal-900);
	}

	.info-box {
		margin: 0 -1rem 0 -1rem;
		padding: 1rem;
		border: 1px solid var(--color-yellow-200);
		border-radius: 1rem;
		background-color: var(--color-yellow-050);
	}

	.info-box .teaser--content {
		color: var(--color-yellow-700);
	}

	.info-box .button--action {
		background-color: var(--color-yellow-600);
		color: var(--color-white);
		border-color: var(--color-yellow-600);
	}

	.teaser-highlight {
		margin: 0 -1rem 0 -1rem;
		padding: 1rem;
		border: 1px solid var(--color-teal-200);
		border-radius: 1rem;
		background-color: var(--color-teal-050);
	}

	.teaser-highlight .teaser--content {
		color: var(--color-teal-700);
	}

	.teaser-highlight .button--action {
		background-color: var(--color-gray-800);
		color: var(--color-white);
		border-color: var(--color-gray-600);
	}

	.quote {
		background-color: red;
	}
</style>
