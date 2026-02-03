<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import OrganizationalUnitProperties from '$lib/components/OrganizationalUnitProperties.svelte';
	import PropertiesDialog from '$lib/components/PropertiesDialog.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import {
		type Container,
		type OrganizationalUnitContainer,
		organizationalUnitType
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import EditableCover from '$lib/components/EditableCover.svelte';
	import transformFileURL from '$lib/transformFileURL.js';
	import { backgroundColors } from '$lib/theme/models';
	import ColorDropdown from '$lib/components/ColorDropdown.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		container: OrganizationalUnitContainer;
		layout: Snippet<[Snippet, Snippet]>;
		relatedContainers?: Container[];
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

	let mayEditStage = $derived(createFeatureDecisions(page.data.features).useStage());

	const handleSubmit = autoSave(container, 2000);
</script>

{#snippet header()}
	<Header />
{/snippet}

{#snippet main()}
	{#if container.payload.cover}
		<div class="cover-section">
			<img alt={$_('logo')} class="cover" src={transformFileURL(container.payload.cover)} />
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
					{#if mayEditStage}
						<EditableCover
							editable={$applicationState.containerDetailView.editable}
							label={$_('add_cover')}
							bind:value={container.payload.cover}
						/>
						<ColorDropdown
							buttonStyle="button"
							bind:value={container.payload.color}
							label={$_('highlight')}
							editable={$applicationState.containerDetailView.editable}
						/>
					{/if}
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
							<span class="is-visually-hidden">{$_('organizational_unit.properties.title')}</span>
						</button>
					{/if}
				</header>

				<PropertiesDialog
					bind:dialog
					{container}
					{relatedContainers}
					title={$_('organizational_unit.properties.title')}
				>
					<OrganizationalUnitProperties bind:container editable />
				</PropertiesDialog>

				{#if container.payload.organizationalUnitType !== organizationalUnitType.enum['organizational_unit_type.administrative_area']}
					{#key container.guid}
						<EditableFormattedText
							editable={$applicationState.containerDetailView.editable &&
								$ability.can('update', container)}
							bind:value={container.payload.description}
						/>
					{/key}
				{/if}
			</form>
		</div>
		<div class="details" bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>
			<Sections bind:container {relatedContainers} />
		</div>
	</article>
{/snippet}

{@render layout(header, main)}

<style>
	header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.stage--buttons {
		min-height: 4rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	header button {
		margin-left: auto;
	}

	h1 {
		flex-grow: 1;
		margin: 0;
		min-height: 3rem;
	}
</style>
