<script lang="ts">
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import ResourceProperties from '$lib/components/ResourceProperties.svelte';
	import { type AnyContainer, type Container, type ResourceContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: ResourceContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<ResourceProperties
			bind:container
			editable={$applicationState.containerDetailView.editable}
			{relatedContainers}
			{revisions}
		/>
	{/snippet}
</EditableContainerDetailView>
