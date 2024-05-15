<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import ObjectiveWizard from '$lib/components/ObjectiveWizard.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { inview } from '$lib/inview';
	import { audience, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptyStrategicGoalContainer, StrategicGoalContainer } from '$lib/models';
	import { applicationState, setContainerFormActiveTab } from '$lib/stores';

	export let container: StrategicGoalContainer | EmptyStrategicGoalContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data']
		}
	}));
</script>

<fieldset
	class="form-tab"
	id="metadata"
	use:inview
	on:inview_enter={() => setContainerFormActiveTab('metadata')}
>
	<legend>{$_('form.metadata')}</legend>

	<StrategyRelationSelector {container} />

	<OrganizationSelector bind:container />

	<ListBox
		label={$_('audience')}
		options={audience.options}
		bind:value={container.payload.audience}
	/>
</fieldset>

<fieldset
	class="form-tab"
	id="basic-data"
	use:inview
	on:inview_enter={() => setContainerFormActiveTab('basic-data')}
>
	<legend>{$_('form.basic_data')}</legend>

	<label>
		{$_('summary')}
		<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}

	<ObjectiveWizard {container} />

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
