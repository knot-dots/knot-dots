<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import MeasureTypeSelector from '$lib/components/MeasureTypeSelector.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StatusSelector from '$lib/components/StatusSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import { type EmptyMeasureContainer, type MeasureContainer, status } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: MeasureContainer | EmptyMeasureContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'basic-data',
			tabs: ['basic-data', 'metadata']
		}
	}));
</script>

<fieldset class="form-tab" id="basic-data">
	<label>
		{$_('measure.summary')}
		<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('measure.description')} bind:value={container.payload.description} />

		{#if container.payload.status === status.enum['status.in_planning']}
			<Editor label={$_('annotation')} bind:value={container.payload.annotation} />
		{:else if container.payload.status === status.enum['status.in_implementation']}
			<Editor label={$_('comment')} bind:value={container.payload.comment} />
		{:else if container.payload.status === status.enum['status.in_operation']}
			<Editor label={$_('result')} bind:value={container.payload.result} />
		{/if}
	{/key}

	<fieldset class="duration">
		<legend>{$_('planned_duration')}</legend>
		<label>
			{$_('start_date')}
			<input type="date" name="startDate" bind:value={container.payload.startDate} />
		</label>
		<label>
			{$_('end_date')}
			<input type="date" name="endDate" bind:value={container.payload.endDate} />
		</label>
	</fieldset>
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<StatusSelector bind:value={container.payload.status} />

	<MeasureTypeSelector bind:value={container.payload.measureType} />

	<StrategyRelationSelector {container} />

	<TopicSelector bind:value={container.payload.topic} />

	<CategorySelector bind:value={container.payload.category} />

	<AudienceSelector bind:value={container.payload.audience} />

	<OrganizationSelector bind:container />

	<label>
		<input
			class="toggle"
			type="checkbox"
			name="template"
			bind:checked={container.payload.template}
		/>
		{$_('template')}
	</label>
</fieldset>

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
