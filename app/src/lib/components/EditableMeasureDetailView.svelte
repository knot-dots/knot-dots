<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
	import MeasureProperties from '$lib/components/MeasureProperties.svelte';
	import {
		type AnyContainer,
		type Container,
		type ContainerWithEffect,
		isMeasureContainer,
		isSimpleMeasureContainer,
		payloadTypes,
		status
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: ContainerWithEffect;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<MeasureProperties
			bind:container
			editable={$applicationState.containerDetailView.editable}
			{relatedContainers}
			{revisions}
		/>

		{#key container.guid}
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
		{/key}

		<div class="details-tab" id="resources">
			<h3>{$_('resources')}</h3>
			<EditablePartOfMeasureCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
				payloadType={payloadTypes.enum.resource}
			/>
		</div>

		<div class="details-tab" id="goals">
			<h3>{$_('goals')}</h3>
			<EditablePartOfMeasureCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
				payloadType={payloadTypes.enum.goal}
			/>
		</div>
	{/snippet}
</EditableContainerDetailView>
