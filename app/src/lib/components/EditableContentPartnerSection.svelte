<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { Attachment } from 'svelte/attachments';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import EditableImageInline from '$lib/components/EditableImageInline.svelte';
	import { type AnyContainer, type ContentPartnerContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ContentPartnerContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const init: Attachment = (element) => {
		if (container.payload.title == '') {
			(element as HTMLElement).focus();
		}
	};

	let canUpdate = $derived(editable && $ability.can('update', container));
</script>

<div class="content-partner-section">
	<div class="content-partner-section__content">
		{#if canUpdate}
			<ul class="absolute-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown bind:container bind:relatedContainers bind:parentContainer />
				</li>
			</ul>
		{/if}

		<EditableImageInline
			{editable}
			label={$_(canUpdate ? 'upload.image.add' : 'cover')}
			bind:value={container.payload.image}
		/>

		<header>
			{#if canUpdate}
				<svelte:element
					this={heading}
					bind:textContent={container.payload.title}
					class="details-heading"
					contenteditable="plaintext-only"
					role="textbox"
					tabindex="0"
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
					{@attach init}
				></svelte:element>
			{:else}
				<svelte:element this={heading} class="details-heading" contenteditable="false">
					{container.payload.title}
				</svelte:element>
			{/if}
		</header>
	</div>
</div>

<style>
	.content-partner-section {
		position: relative;
	}

	.content-partner-section__content {
		position: relative;
	}

	.absolute-actions {
		--dropdown-button-icon-default-color: var(--color-gray-700);
		--dropdown-button-icon-size: 1rem;
		align-items: center;
		background-color: white;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		position: absolute;
		right: -0.75rem;
		top: -0.75rem;
		z-index: 10;
	}

	header {
		margin-top: 1rem;
	}
</style>
