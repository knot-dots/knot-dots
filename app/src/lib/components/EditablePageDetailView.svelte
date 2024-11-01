<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import type { AnyContainer, PageContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: PageContainer;
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView {container} relatedContainers={[]} {revisions} tabs={[]}>
	<svelte:fragment slot="data">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			label={$_('body')}
			bind:value={container.payload.body}
		/>
	</svelte:fragment>
</EditableContainerDetailView>
