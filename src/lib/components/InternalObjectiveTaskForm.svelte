<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { taskCategories, taskStatus } from '$lib/models';
	import type {
		AnyContainer,
		EmptyTaskContainer,
		TaskCategory,
		TaskContainer,
		User
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: TaskContainer | EmptyTaskContainer;
	export let isPartOfOptions: AnyContainer[];

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data']
		}
	}));

	let membersPromise: Promise<User[]> = new Promise(() => []);

	onMount(() => {
		membersPromise = fetchMembers(
			$page.data.currentOrganizationalUnit?.guid ?? $page.data.currentOrganization.guid
		);
	});

	let statusParam = paramsFromURL($page.url).get('task-status');

	let assignee = container.payload.assignee;
	$: container.payload.assignee = assignee == '' ? undefined : assignee;

	let taskCategory: TaskCategory | '' | undefined = container.payload.taskCategory;
	$: container.payload.taskCategory = taskCategory == '' ? undefined : taskCategory;
</script>

{#if $applicationState.containerForm.activeTab === 'metadata'}
	<fieldset class="form-tab" id="metadata">
		<legend>{$_('form.metadata')}</legend>

		<RelationSelector {container} {isPartOfOptions} />

		<OrganizationSelector bind:container />
	</fieldset>
{:else if $applicationState.containerForm.activeTab === 'basic-data'}
	<fieldset class="form-tab" id="basic-data">
		<legend>{$_('form.basic_data')}</legend>

		<Editor label={$_('description')} bind:value={container.payload.description} />

		<label>
			{$_('task_status.label')}
			<select name="status" bind:value={container.payload.taskStatus} required>
				{#each taskStatus.options as statusOption}
					<option value={statusOption} selected={statusOption === statusParam}>
						{$_(statusOption)}
					</option>
				{/each}
			</select>
		</label>

		<label>
			{$_('assignee')}
			<select name="assignee" bind:value={assignee}>
				<option></option>
				{#await membersPromise then members}
					{#each members as { display_name, guid }}
						<option value={guid} selected={guid === assignee}>
							{display_name}
						</option>
					{/each}
				{/await}
			</select>
		</label>

		<label>
			{$_('task_category.label')}
			<select name="taskCategory" bind:value={taskCategory}>
				<option></option>
				{#each taskCategories.options as taskCategoryOption}
					<option value={taskCategoryOption}>
						{$_(taskCategoryOption)}
					</option>
				{/each}
			</select>
		</label>

		<label>
			{$_('fulfillment_date')}
			<input type="date" bind:value={container.payload.fulfillmentDate} />
		</label>
	</fieldset>
{/if}
