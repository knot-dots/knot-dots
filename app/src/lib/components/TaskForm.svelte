<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import MeasureRelationSelector from '$lib/components/MeasureRelationSelector.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import { taskCategories, taskStatus } from '$lib/models';
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

	let membersPromise: Promise<User[]> = new Promise(() => []);

	onMount(() => {
		membersPromise = fetchMembers(
			$page.data.currentOrganizationalUnit?.guid ?? $page.data.currentOrganization.guid
		);
	});
</script>

<fieldset class="form-tab" id="basic-data">
	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<ListBox
		label={$_('task_status.label')}
		options={taskStatus.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.taskStatus}
	/>

	{#await membersPromise}
		<ListBox label={$_('assignee')} options={[]} bind:value={container.payload.assignee} />
	{:then members}
		<ListBox
			label={$_('assignee')}
			options={members
				.filter(({ display_name }) => display_name !== '')
				.map(({ display_name, guid }) => ({ value: guid, label: display_name }))}
			bind:value={container.payload.assignee}
		/>
	{/await}

	<ListBox
		label={$_('task_category.label')}
		options={taskCategories.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.taskCategory}
	/>

	<label class="meta">
		<span class="meta-key">{$_('fulfillment_date')}</span>
		<input class="meta-value" type="date" bind:value={container.payload.fulfillmentDate} />
	</label>

	<MeasureRelationSelector bind:container />

	<OrganizationSelector bind:container />
</fieldset>
