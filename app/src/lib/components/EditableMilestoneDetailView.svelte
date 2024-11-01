<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableOwnedBy from '$lib/components/EditableOwnedBy.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import { type AnyContainer, type Container, type MilestoneContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: MilestoneContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			label={$_('description')}
			bind:value={container.payload.description}
		/>

		<div class="tasks">
			<h3>{$_('tasks')}</h3>
			<EditableTaskCarousel {container} editable={$applicationState.containerDetailView.editable} />
		</div>

		<EditableProgress
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.progress}
		/>

		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		<EditableMeasure {container} editable={$applicationState.containerDetailView.editable} />

		<EditableAudience
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.audience}
		/>

		<EditableOwnedBy editable={$applicationState.containerDetailView.editable} bind:container />
	</svelte:fragment>
</EditableContainerDetailView>
