<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import ResourcePlanner from '$lib/components/ResourcePlanner.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, measureTypes, status, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptySimpleMeasureContainer, SimpleMeasureContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: SimpleMeasureContainer | EmptySimpleMeasureContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data', 'resources']
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

	<Editor label={$_('description')} bind:value={container.payload.description} />

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

	<label>
		{$_('progress')}
		<input
			type="range"
			max="1"
			min="0"
			list="steps"
			step="0.1"
			bind:value={container.payload.progress}
		/>
		<datalist id="steps">
			<option value="0"></option>
			<option value="0.1"></option>
			<option value="0.2"></option>
			<option value="0.3"></option>
			<option value="0.4"></option>
			<option value="0.5"></option>
			<option value="0.6"></option>
			<option value="0.7"></option>
			<option value="0.8"></option>
			<option value="0.9"></option>
			<option value="1"></option>
		</datalist>
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('annotation')} bind:value={container.payload.annotation} />
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

<fieldset class="form-tab" id="resources">
	<legend>{$_('form.resources')}</legend>

	<ResourcePlanner {container} />
</fieldset>

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
