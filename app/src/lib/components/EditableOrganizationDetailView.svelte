<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import OrganizationProperties from '$lib/components/OrganizationProperties.svelte';
	import PropertiesDialog from '$lib/components/PropertiesDialog.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { type Container, type OrganizationContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import EditableCover from '$lib/components/EditableCover.svelte';
	import transformFileURL from '$lib/transformFileURL.js';
	import {backgroundColors} from '$lib/theme/models';
	import ColorDropdown from "$lib/components/ColorDropdown.svelte";

	interface Props {
		container: OrganizationContainer;
		relatedContainers?: Container[];
	}

	let {
		container: originalContainer = $bindable(),
		relatedContainers: originalRelatedContainers = []
	}: Props = $props();

	let container = $state(originalContainer);

	let relatedContainers = $derived([originalContainer, ...originalRelatedContainers]);

	let w = $state(0);

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	// svelte-ignore state_referenced_locally
	const handleSubmit = autoSave(container, 2000);
</script>

{#if container.payload.cover}
	<div class="cover-section">
		<img alt={$_('logo')} class="cover" src={transformFileURL(container.payload.cover)} />
	</div>
{/if}
<article class="details stage stage--{backgroundColors.get(container.payload.color)}"
		 bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>

	<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
		<div class="details-section">
			<EditableCover editable={$applicationState.containerDetailView.editable}
						   label="{$_('add_cover')}"
						   bind:value={container.payload.cover} />
			<ColorDropdown
					buttonStyle='button'
					bind:value={container.payload.color}
					label="{$_('highlight')}"
					editable={$applicationState.containerDetailView.editable}/>
		</div>
		<header class="details-section">
			<EditableLogo
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.image}
			/>

			{#if $applicationState.containerDetailView.editable}
				<h1
					class="details-title"
					contenteditable="plaintext-only"
					bind:textContent={container.payload.name}
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				></h1>
			{:else}
				<h1 class="details-title" contenteditable="false">
					{container.payload.name}
				</h1>
			{/if}

			{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
				<button class="action-button" onclick={() => dialog.showModal()} type="button">
					<Ellipsis />
				</button>
			{/if}
		</header>

		<PropertiesDialog
			bind:dialog
			{container}
			{relatedContainers}
			title={$_('organization.properties.title')}
		>
			<OrganizationProperties bind:container editable />
		</PropertiesDialog>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}
	</form>

	<Sections bind:container {relatedContainers} />
</article>

<style>
	header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	header button {
		margin-left: auto;
	}

	h1 {
		margin: 0;
		min-height: 3rem;
	}
</style>
