<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import type { AnyContainer, PageContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: PageContainer;
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView bind:container relatedContainers={[]} {revisions}>
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
