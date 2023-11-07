<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { sustainableDevelopmentGoals, topics } from '$lib/models';
	import type { EmptyStrategicGoalContainer, StrategicGoalContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: StrategicGoalContainer | EmptyStrategicGoalContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data']
		}
	}));
</script>

{#if $applicationState.containerForm.activeTab === 'metadata'}
	<fieldset class="form-tab" id="metadata">
		<legend>{$_('form.metadata')}</legend>

		<StrategyRelationSelector {container} />

		<OrganizationSelector bind:container />
	</fieldset>
{:else if $applicationState.containerForm.activeTab === 'basic-data'}
	<fieldset class="form-tab" id="basic-data">
		<legend>{$_('form.basic_data')}</legend>

		<label>
			{$_('summary')}
			<textarea name="summary" maxlength="200" bind:value={container.payload.summary} required />
		</label>

		<Editor label={$_('description')} bind:value={container.payload.description} />

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
	</fieldset>
{/if}
