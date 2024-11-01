<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import EditableOwnedBy from '$lib/components/EditableOwnedBy.svelte';
	import EditableStrategy from '$lib/components/EditableStrategy.svelte';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import { type AnyContainer, type Container, type VisionContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: VisionContainer;
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

		<div class="objectives">
			<h3>{$_('objectives')}</h3>
			<EditableObjectiveCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
			/>
		</div>

		<div class="tasks">
			<h3>{$_('tasks')}</h3>
			<EditableTaskCarousel {container} editable={$applicationState.containerDetailView.editable} />
		</div>

		<EditableStrategy {container} editable={$applicationState.containerDetailView.editable} />

		<EditableTopic
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.topic}
		/>

		<EditableCategory
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.category}
		/>

		<EditableAudience
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.audience}
		/>

		<EditableOwnedBy editable={$applicationState.containerDetailView.editable} bind:container />
	</svelte:fragment>
</EditableContainerDetailView>
