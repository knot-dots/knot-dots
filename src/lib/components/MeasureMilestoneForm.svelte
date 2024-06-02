<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import {
		audience,
		type EmptyMeasureMilestoneContainer,
		type MeasureMilestoneContainer
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: EmptyMeasureMilestoneContainer | MeasureMilestoneContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data']
		}
	}));
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
		{$_('summary')}
		<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}

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

	<label>
		{$_('fulfillment_date')}
		<input type="date" bind:value={container.payload.fulfillmentDate} />
	</label>
</fieldset>

<style>
	input[type='range'] {
		width: 100%;
	}
</style>
