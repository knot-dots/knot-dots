<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDuration from '$lib/components/EditableDuration.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableFile from '$lib/components/EditableFile.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMeasureType from '$lib/components/EditableMeasureType.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableStrategy from '$lib/components/EditableStrategy.svelte';
	import EditableStatus from '$lib/components/EditableStatus.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import {
		type AnyContainer,
		type Container,
		type ContainerWithEffect,
		isMeasureContainer,
		isSimpleMeasureContainer,
		payloadTypes,
		status
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: ContainerWithEffect;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView
	{container}
	{relatedContainers}
	{revisions}
	tabs={['basic-data', 'resources', 'effects', 'milestones', 'metadata']}
>
	<svelte:fragment slot="data">
		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				aiSuggestion={container.payload.aiSuggestion}
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		{#if isSimpleMeasureContainer(container)}
			<EditableFile
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.file}
			/>
		{/if}

		<EditableDuration editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableStatus
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.status}
		/>

		<EditableMeasureType
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.measureType}
		/>

		<EditableStrategy editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableParent editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableTopic
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.topic}
		/>

		<EditablePolicyFieldBNK
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.policyFieldBNK}
		/>

		<EditableCategory
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.category}
		/>

		<EditableAudience
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.audience}
		/>

		<EditableOrganization
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<EditableOrganizationalUnit
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	</svelte:fragment>

	<svelte:fragment slot="extra">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			label={$_('measure.description')}
			bind:value={container.payload.description}
		/>

		{#if (isMeasureContainer(container) && container.payload.status === status.enum['status.in_planning']) || isSimpleMeasureContainer(container)}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('annotation')}
				bind:value={container.payload.annotation}
			/>
		{:else if isMeasureContainer(container) && container.payload.status === status.enum['status.in_implementation']}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('comment')}
				bind:value={container.payload.comment}
			/>
		{:else if isMeasureContainer(container) && (container.payload.status === status.enum['status.in_operation'] || container.payload.status === status.enum['status.done'])}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('result')}
				bind:value={container.payload.result}
			/>
		{/if}

		<div class="details-tab" id="resources">
			<h3>{$_('resources')}</h3>
			<EditablePartOfMeasureCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
				payloadType={payloadTypes.enum.resource}
			/>
		</div>

		<div class="details-tab" id="measure-results">
			<h3>{$_('measure_results')}</h3>
			<EditablePartOfMeasureCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
				payloadType={payloadTypes.enum.measure_result}
			/>
		</div>

		<div class="details-tab" id="milestones">
			<h3>{$_('milestones')}</h3>
			<EditablePartOfMeasureCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
				payloadType={payloadTypes.enum.milestone}
			/>
		</div>
	</svelte:fragment>
</EditableContainerDetailView>
