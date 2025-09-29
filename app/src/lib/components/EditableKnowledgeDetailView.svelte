<script lang="ts">
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import KnowledgeProperties from '$lib/components/KnowledgeProperties.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import { type KnowledgeContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: KnowledgeContainer;
		relatedContainers: any[];
		revisions: any[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container>
	{#snippet data()}
		<KnowledgeProperties
			bind:container
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
			{relatedContainers}
			{revisions}
		/>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				bind:value={container.payload.description}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>

<footer class="content-footer bottom-actions-bar">
	<div class="content-actions">
		<RelationButton {container} />
		<CreateCopyButton {container} />
		<DeleteButton {container} {relatedContainers} />
	</div>
</footer>
