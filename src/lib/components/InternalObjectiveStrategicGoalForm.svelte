<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { audience } from '$lib/models';
	import type {
		AnyContainer,
		EmptyInternalObjectiveStrategicGoalContainer,
		InternalObjectiveStrategicGoalContainer
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container:
		| InternalObjectiveStrategicGoalContainer
		| EmptyInternalObjectiveStrategicGoalContainer;
	export let isPartOfOptions: AnyContainer[];

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

		<RelationSelector {container} {isPartOfOptions} />

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
	</fieldset>
{/if}
