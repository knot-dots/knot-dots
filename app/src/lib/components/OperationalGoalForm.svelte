<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { OperationalGoalContainer, EmptyOperationalGoalContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: OperationalGoalContainer | EmptyOperationalGoalContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'basic-data',
			tabs: ['basic-data', 'metadata']
		}
	}));

	let withProgress = 'progress' in container.payload;
</script>

<fieldset class="form-tab" id="basic-data">
	<label>
		{$_('summary')}
		<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}

	<label>
		<input
			class="toggle"
			type="checkbox"
			bind:checked={withProgress}
			disabled={'guid' in container && 'progress' in container.payload}
		/>
		{$_('form.with_progress')}
	</label>

	{#if withProgress}
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
	{/if}
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<label class="meta">
		<span class="meta-key">{$_('fulfillment_date')}</span>
		<input class="meta-value" type="date" bind:value={container.payload.fulfillmentDate} />
	</label>

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
</fieldset>
