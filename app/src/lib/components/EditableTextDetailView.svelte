<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import TextProperties from '$lib/components/TextProperties.svelte';
	import type { AnyContainer, Container, TextContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: TextContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<TextProperties
			bind:container
			editable={$applicationState.containerDetailView.editable}
			{relatedContainers}
			{revisions}
		/>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('body')}
				bind:value={container.payload.body}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>
