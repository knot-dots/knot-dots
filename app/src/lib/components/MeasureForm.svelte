<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, measureTypes, status, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptyMeasureContainer, MeasureContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: MeasureContainer | EmptyMeasureContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'basic-data',
			tabs: ['basic-data', 'metadata']
		}
	}));

	let statusParam = paramsFromURL($page.url).get('status') ?? status.enum['status.idea'];
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

	<label class="meta">
		<span class="meta-key">{$_('status.label')}</span>
		<select class="meta-value" name="status" bind:value={container.payload.status} required>
			{#each status.options as statusOption}
				<option value={statusOption} selected={statusOption === statusParam}>
					{$_(statusOption)}
				</option>
			{/each}
		</select>
	</label>

	<ListBox
		label={$_('measure_type')}
		options={measureTypes.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.measureType}
	/>

	<StrategyRelationSelector {container} />

	<ListBox
		label={$_('topic.label')}
		options={topics.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.topic}
	/>

	<ListBox
		label={$_('category')}
		options={sustainableDevelopmentGoals.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.category}
	/>

	<ListBox
		label={$_('audience')}
		options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.audience}
	/>

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
