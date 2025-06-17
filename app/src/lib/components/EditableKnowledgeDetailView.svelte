<script lang="ts">
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import KnowledgeProperties from '$lib/components/KnowledgeProperties.svelte';
	import { type KnowledgeContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: KnowledgeContainer;
		relatedContainers: any[];
		revisions: any[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<KnowledgeProperties
			bind:container
			editable={$applicationState.containerDetailView.editable}
			{relatedContainers}
			{revisions}
		/>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.description}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>
