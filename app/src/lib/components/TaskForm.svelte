<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import AssigneeSelector from '$lib/components/AssigneeSelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import MeasureRelationSelector from '$lib/components/MeasureRelationSelector.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import TaskCategorySelector from '$lib/components/TaskCategorySelector.svelte';
	import TaskStatusSelector from '$lib/components/TaskStatusSelector.svelte';
	import type { EmptyTaskContainer, TaskContainer, User } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: TaskContainer | EmptyTaskContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'basic-data',
			tabs: ['basic-data', 'metadata']
		}
	}));

	$: membersPromise = fetchMembers(container.organizational_unit ?? container.organization);
</script>

<fieldset class="form-tab" id="basic-data">
	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<TaskStatusSelector bind:value={container.payload.taskStatus} />

	{#await membersPromise}
		<AssigneeSelector candidates={[]} value={container.payload.assignee} />
	{:then members}
		<AssigneeSelector candidates={members} bind:value={container.payload.assignee} />
	{/await}

	<TaskCategorySelector bind:value={container.payload.taskCategory} />

	<label class="meta">
		<span class="meta-key">{$_('fulfillment_date')}</span>
		<input class="meta-value" type="date" bind:value={container.payload.fulfillmentDate} />
	</label>

	<MeasureRelationSelector bind:container />

	<OrganizationSelector bind:container />
</fieldset>
