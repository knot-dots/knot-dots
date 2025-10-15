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

	interface Props {
		container: OrganizationalUnitContainer;
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

<article class="details" bind:clientWidth={w} style={w ? `--content-width: ${w}px;` : undefined}>
	<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
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

		<PropertiesDialog bind:dialog title={$_('organizational_unit.properties.title')}>
			<OrganizationalUnitProperties bind:container editable />
		</PropertiesDialog>

		{#if container.payload.organizationalUnitType !== organizationalUnitType.enum['organizational_unit_type.administrative_area']}
			{#key container.guid}
				<EditableFormattedText
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					label={$_('description')}
					bind:value={container.payload.description}
				/>
			{/key}
		{/if}
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
