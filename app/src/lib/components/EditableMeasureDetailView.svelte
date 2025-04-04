<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMeasureType from '$lib/components/EditableMeasureType.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
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

	let selectedRevision: ContainerWithEffect;

	$: {
		const parseResult = status.safeParse(paramsFromURL($page.url).get('status'));
		if (parseResult.success) {
			selectedRevision =
				(revisions as ContainerWithEffect[]).findLast(
					({ payload }) => payload.status == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}
</script>

<EditableContainerDetailView
	container={selectedRevision}
	{relatedContainers}
	{revisions}
	tabs={['basic-data', 'resources', 'effects', 'milestones', 'metadata']}
>
	<svelte:fragment slot="data">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			label={$_('description')}
			bind:value={container.payload.description}
		/>

		{#if isSimpleMeasureContainer(container)}
			<EditableProgress
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.payload.progress}
			/>
		{/if}

		{#if (isMeasureContainer(container) && selectedRevision.payload.status === status.enum['status.in_planning']) || isSimpleMeasureContainer(selectedRevision)}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('annotation')}
				bind:value={container.payload.annotation}
			/>
		{:else if isMeasureContainer(container) && selectedRevision.payload.status === status.enum['status.in_implementation']}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('comment')}
				bind:value={container.payload.comment}
			/>
		{:else if isMeasureContainer(container) && (selectedRevision.payload.status === status.enum['status.in_operation'] || selectedRevision.payload.status === status.enum['status.done'])}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('result')}
				bind:value={container.payload.result}
			/>
		{/if}

		<div id="resources">
			<h3>{$_('resources')}</h3>
			<EditablePartOfMeasureCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
				payloadType={payloadTypes.enum.resource}
			/>
		</div>

		<div id="measure-results">
			<h3>{$_('measure_results')}</h3>
			<EditablePartOfMeasureCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
				payloadType={payloadTypes.enum.measure_result}
			/>
		</div>

		<div id="milestones">
			<h3>{$_('milestones')}</h3>
			<EditablePartOfMeasureCarousel
				{container}
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
				payloadType={payloadTypes.enum.milestone}
			/>
		</div>

		{#if $applicationState.containerDetailView.editable}
			<fieldset class="tabular">
				<span class="label">{$_('planned_duration')}</span>
				<span>
					<label class="is-visually-hidden" for="startDate">
						{$_('start_date')}
					</label>
					<input
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
						id="endDate"
						type="date"
						bind:value={container.payload.endDate}
						on:change={requestSubmit}
					/>
				</span>
			</fieldset>
		{:else}
			<p class="tabular">
				<span class="label">{$_('planned_duration')}</span>
				<span class="value">
					{#if selectedRevision.payload.startDate && selectedRevision.payload.endDate}
						{$date(new Date(selectedRevision.payload.startDate), { format: 'long' })}–{$date(
							new Date(selectedRevision.payload.endDate),
							{ format: 'long' }
						)}
					{:else if selectedRevision.payload.startDate}
						{$date(new Date(selectedRevision.payload.startDate), { format: 'long' })}–
					{:else}
						&nbsp;
					{/if}
				</span>
			</p>
		{/if}

		<EditableMeasureType
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.measureType}
		/>

		<EditableStatus
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.status}
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
</EditableContainerDetailView>

<style>
	fieldset {
		border: none;
	}

	label {
		padding: 0 1rem;
	}

	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 3rem;
		width: auto;
	}
</style>
