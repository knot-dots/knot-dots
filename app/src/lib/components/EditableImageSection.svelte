<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import { type AnyContainer, type ImageContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import EditableImageInline from './EditableImageInline.svelte';

	interface Props {
		container: ImageContainer;
		editable?: boolean;
		heading?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading = 'h2',
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const init: Attachment = (element) => {
		if (container.payload.title == '') {
			(element as HTMLElement).focus();
		}
	};
</script>

<header>
	{#if editable && $ability.can('update', container)}
		<svelte:element
			this={heading}
			{@attach init}
			bind:textContent={container.payload.title}
			class="details-heading"
			contenteditable="plaintext-only"
			onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
			role="heading"
		></svelte:element>
	{:else}
		<svelte:element this={heading} class="details-heading" contenteditable="false">
			{container.payload.title}
		</svelte:element>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

<EditableImageInline
	{editable}
	label={$_('image')}
	bind:value={container.payload.image}
	bind:altAttribute={container.payload.imageAltText}
	bind:sourceAttribute={container.payload.imageSource}
/>
