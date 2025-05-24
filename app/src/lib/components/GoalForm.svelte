<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import GoalTypeSelector from '$lib/components/GoalTypeSelector.svelte';
	import MeasureRelationSelector from '$lib/components/MeasureRelationSelector.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import PolicyFieldBNKSelector from '$lib/components/PolicyFieldBNKSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import { type GoalContainer, type EmptyGoalContainer, predicates } from '$lib/models';

	export let container: GoalContainer | EmptyGoalContainer;

	let withProgress = 'progress' in container.payload;
</script>

<fieldset class="form-tab" id="basic-data">
	<label>
		{$_('summary')}
		<textarea name="summary" maxlength="200" bind:value={container.payload.summary}></textarea>
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

	<GoalTypeSelector bind:value={container.payload.goalType} />

	<label class="meta">
		<span class="meta-key">{$_('fulfillment_date')}</span>
		<input class="meta-value" type="date" bind:value={container.payload.fulfillmentDate} />
	</label>

	{#if container.relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])}
		<MeasureRelationSelector {container} />
	{:else}
		<StrategyRelationSelector {container} />
	{/if}

	<TopicSelector bind:value={container.payload.topic} />

	<PolicyFieldBNKSelector bind:value={container.payload.policyFieldBNK} />

	<CategorySelector bind:value={container.payload.category} />

	<AudienceSelector bind:value={container.payload.audience} />

	<OrganizationSelector bind:container />
</fieldset>
