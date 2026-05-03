<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import ColorDropdown from '$lib/components/ColorDropdown.svelte';
	import EditableCover from '$lib/components/EditableCover.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import ImageReplacesNameToggle from '$lib/components/ImageReplacesNameToggle.svelte';
	import OrganizationProperties from '$lib/components/OrganizationProperties.svelte';
	import PropertiesDialog from '$lib/components/PropertiesDialog.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { type AnyContainer, helpSlug, type OrganizationContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import transformFileURL from '$lib/transformFileURL.js';
	import { backgroundColors } from '$lib/theme/models';

	interface Props {
		container: OrganizationContainer;
		layout: Snippet<[Snippet, Snippet]>;
		relatedContainers?: AnyContainer[];
	}

	let {
		container = $bindable(),
		layout,
		relatedContainers: originalRelatedContainers = []
	}: Props = $props();

	let relatedContainers = $derived([container, ...originalRelatedContainers]);

	let w = $state(0);

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	const handleSubmit = $derived(autoSave(container, 2000));
</script>

{#snippet header()}
	<Header />
{/snippet}

{#snippet main()}
	{#if container.payload.cover}
		<div class="cover-section">
			<img alt={$_('cover')} class="cover" src={transformFileURL(container.payload.cover)} />
			{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
				<label class="cover-source">
					{$_('image_source')}:
					<input bind:value={container.payload.coverSource} name="coverSource" type="text" />
				</label>
			{:else if container.payload.coverSource}
				<span class="cover-source">
					{$_('image_source')}: {container.payload.coverSource}
				</span>
			{/if}
		</div>
	{/if}
	<article>
		<div
			class="details stage stage--{container.payload.color
				? backgroundColors.get(container.payload.color)
				: 'white'}"
		>
			<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
				<div class="stage--buttons details-section">
					<EditableCover
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
						label={$_('add_cover')}
						bind:value={container.payload.cover}
					/>
					<ColorDropdown
						buttonStyle="button"
						bind:value={container.payload.color}
						label={$_('highlight')}
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
					/>
					{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
						<ImageReplacesNameToggle bind:value={container.payload.imageReplacesName} />
					{/if}
				</div>
				<header class="details-section">
					<EditableLogo
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
						bind:value={container.payload.image}
					/>

					{#if !container.payload.imageReplacesName}
						{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
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
					{/if}

					{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
						<button class="action-button" onclick={() => dialog.showModal()} type="button">
							<Ellipsis />
							<span class="is-visually-hidden">{$_('organization.properties.title')}</span>
						</button>
					{/if}
				</header>

				<PropertiesDialog
					bind:dialog
					{container}
					{relatedContainers}
					title={$_('organization.properties.title')}
				>
					<OrganizationProperties bind:container editable={$ability.can('update', container)} />
				</PropertiesDialog>

				{#key container.guid}
					<EditableFormattedText
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container)}
						bind:value={container.payload.description}
					/>
				{/key}
			</form>
		</div>

		<div class="details" bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>
			<Sections bind:container {relatedContainers} />
		</div>
	</article>

	<Help slug={helpSlug.enum['organization-view']} />
{/snippet}

{@render layout(header, main)}

<style>
	header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.stage--buttons {
		min-height: 3.125rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 0;
	}

	header button {
		margin-left: auto;
	}

	h1 {
		flex-grow: 1;
		margin: 0;
		min-height: 3rem;
	}

	.stage {
		padding-bottom: 0;
	}

	.stage:not(.stage--white) {
		padding-bottom: 2rem;
	}

	.stage + .details {
		padding-top: 4rem;
	}

	.cover-section {
		position: relative;
	}

	.cover-source {
		background-color: rgba(255, 255, 255, 0.85);
		bottom: 0;
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 400;
		padding: 0.125rem 0.25rem;
		position: absolute;
		right: 0;
	}

	.cover-source input {
		border: none;
		border-radius: 4px;
		display: inline;
		color: inherit;
		field-sizing: content;
		font-size: inherit;
		font-weight: inherit;
		padding: 0.125rem 0.25rem;
		min-width: 4rem;
		width: fit-content;
	}
</style>
