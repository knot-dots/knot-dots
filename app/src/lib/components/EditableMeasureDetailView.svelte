<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import MeasureProperties from '$lib/components/MeasureProperties.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { type AnyContainer, type Container, type ContainerWithEffect } from '$lib/models';
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
