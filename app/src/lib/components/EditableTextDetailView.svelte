<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import type { AnyContainer, Container, TextContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: TextContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container, relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions} tabs={[]}>
	<svelte:fragment slot="data">
		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('body')}
				bind:value={container.payload.body}
			/>
		{/key}
	</svelte:fragment>
</EditableContainerDetailView>
