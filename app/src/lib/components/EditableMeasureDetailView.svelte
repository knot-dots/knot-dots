<script lang="ts">
	import { _ } from 'svelte-i18n';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import MeasureProperties from '$lib/components/MeasureProperties.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import {
		type AnyContainer,
		type Container,
		type ContainerWithEffect,
		isMeasureContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: ContainerWithEffect;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let {
		container = $bindable(),
		relatedContainers: originalRelatedContainers,
		revisions
	}: Props = $props();

	let relatedContainers = $state(originalRelatedContainers);
</script>

<EditableContainerDetailView bind:container>
	{#snippet data()}
		<MeasureProperties
			bind:container
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
			{relatedContainers}
			{revisions}
		/>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}

		<Sections bind:container bind:relatedContainers />
	{/snippet}
</EditableContainerDetailView>

<footer class="content-footer bottom-actions-bar">
	<div class="content-actions">
		{#if $applicationState.containerDetailView.editable && isMeasureContainer(container) && $ability.can('update', container)}
			<label>
				<input
					class="toggle"
					name="template"
					type="checkbox"
					bind:checked={container.payload.template}
				/>
				{$_('template')}
			</label>
		{/if}
		<RelationButton {container} />
		<CreateAnotherButton {container} {relatedContainers} />
		<CreateCopyButton {container} />
		<DeleteButton {container} {relatedContainers} />
	</div>
</footer>

<style>
	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}
</style>
