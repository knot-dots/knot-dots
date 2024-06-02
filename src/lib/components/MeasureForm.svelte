<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import EffectWizard from '$lib/components/EffectWizard.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import ResourcePlanner from '$lib/components/ResourcePlanner.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, measureTypes, status, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptyMeasureContainer, MeasureContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: MeasureContainer | EmptyMeasureContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data', 'resources', 'effects']
		}
	}));

	let statusParam = paramsFromURL($page.url).get('status') ?? status.enum['status.idea'];
</script>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<StrategyRelationSelector {container} />

	<OrganizationSelector bind:container />

	<ListBox
		label={$_('audience')}
		options={audience.options}
		bind:value={container.payload.audience}
	/>
</fieldset>

<fieldset class="form-tab" id="basic-data">
	<legend>{$_('form.basic_data')}</legend>

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

	<ListBox
		label={$_('measure_type')}
		options={measureTypes.options}
		bind:value={container.payload.measureType}
	/>

	<ListBox
		label={$_('topic.label')}
		options={topics.options}
		bind:value={container.payload.topic}
	/>

	<ListBox
		label={$_('category')}
		options={sustainableDevelopmentGoals.options}
		bind:value={container.payload.category}
	/>

	<label>
		{$_('status.label')}
		<select name="status" bind:value={container.payload.status} required>
			{#each status.options as statusOption}
				<option value={statusOption} selected={statusOption === statusParam}>
					{$_(statusOption)}
				</option>
			{/each}
		</select>
	</label>

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

	<ListBox
		label={$_('boards')}
		options={['board.measure_monitoring', 'board.tasks']}
		bind:value={container.payload.boards}
	/>
</fieldset>

<fieldset class="form-tab" id="resources">
	<legend>{$_('form.resources')}</legend>

	<ResourcePlanner {container} />
</fieldset>

<fieldset class="form-tab" id="effects">
	<legend>{$_('form.effects')}</legend>

	<EffectWizard {container} />
</fieldset>

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
