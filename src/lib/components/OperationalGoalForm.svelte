<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import IndicatorWizard from '$lib/components/IndicatorWizard.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import ObjectiveWizard from '$lib/components/ObjectiveWizard.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { OperationalGoalContainer, EmptyOperationalGoalContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: OperationalGoalContainer | EmptyOperationalGoalContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data']
		}
	}));

	let indicatorLocked = container.payload.indicator.length > 0;
</script>

{#if $applicationState.containerForm.activeTab === 'metadata'}
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
{:else if $applicationState.containerForm.activeTab === 'basic-data'}
	<fieldset class="form-tab" id="basic-data">
		<legend>{$_('form.basic_data')}</legend>

		<label>
			{$_('summary')}
			<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
		</label>

		<Editor label={$_('description')} bind:value={container.payload.description} />

		<ObjectiveWizard {container} />

		<IndicatorWizard bind:indicator={container.payload.indicator} locked={indicatorLocked} />

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
			{$_('fulfillment_date')}
			<input type="date" bind:value={container.payload.fulfillmentDate} />
		</label>
	</fieldset>
{/if}
