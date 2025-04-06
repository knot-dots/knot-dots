<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableStrategy from '$lib/components/EditableStrategy.svelte';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import { type AnyContainer, type Container, type ModelContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: ModelContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
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

		{#if $ability.can('update', container.payload.type, 'organization')}
			<EditableOrganization
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.organization}
			/>
		{/if}

		{#if $ability.can('update', container.payload.type, 'organizational_unit')}
			<EditableOrganizationalUnit
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.organizational_unit}
			/>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="extra">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.description}
		/>

		<div class="details-tab" id="objectives">
			<h3>{$_('objectives')}</h3>
			<EditableObjectiveCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
			/>
		</div>

		<div class="details-tab" id="tasks">
			<h3>{$_('tasks')}</h3>
			<EditableTaskCarousel {container} editable={$applicationState.containerDetailView.editable} />
		</div>
	</svelte:fragment>
</EditableContainerDetailView>
