<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFile from '$lib/components/EditableFile.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMeasureType from '$lib/components/EditableMeasureType.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
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
		{#if isSimpleMeasureContainer(container)}
			<EditableFile
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.file}
			/>
		{/if}

		{#if $applicationState.containerDetailView.editable}
			<div class="label">{$_('planned_duration')}</div>
			<fieldset>
				<label class="is-visually-hidden" for="startDate">
					{$_('start_date')}
				</label>
				<input
					class="value"
					id="startDate"
					type="date"
					bind:value={container.payload.startDate}
					on:change={requestSubmit}
				/>
				–
				<label class="is-visually-hidden" for="endDate">
					{$_('end_date')}
				</label>
				<input
					class="value"
					id="endDate"
					type="date"
					bind:value={container.payload.endDate}
					on:change={requestSubmit}
				/>
			</fieldset>
		{:else}
			<div class="label">{$_('planned_duration')}</div>
			<div class="value">
				{#if container.payload.startDate && container.payload.endDate}
					{$date(new Date(container.payload.startDate), { format: 'long' })}–{$date(
						new Date(container.payload.endDate),
						{ format: 'long' }
					)}
				{:else if container.payload.startDate}
					{$date(new Date(container.payload.startDate), { format: 'long' })}–
				{:else}
					{$_('empty')}
				{/if}
			</div>
		{/if}

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
			bind:value={container.organizational_unit}
		/>
	</svelte:fragment>

	<svelte:fragment slot="extra">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
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

<style>
	fieldset {
		border: none;
		padding: 0;
	}

	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 2.25rem;
		width: auto;
	}
</style>
