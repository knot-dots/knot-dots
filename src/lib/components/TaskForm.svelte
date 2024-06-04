<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import MeasureRelationSelector from '$lib/components/MeasureRelationSelector.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import { taskCategories, taskStatus } from '$lib/models';
	import type {
		EmptyTaskContainer,
		PartialRelation,
		TaskCategory,
		TaskContainer,
		User
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: TaskContainer | EmptyTaskContainer;

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

	let statusParam = paramsFromURL($page.url).get('taskStatus');

	if (container.relation.length == 0) {
		container.relation = paramsFromURL($page.url)
			.getAll('is-part-of')
			.map(
				(o): PartialRelation => ({
					object: Number(o),
					position: 0,
					predicate: 'is-part-of'
				})
			)
			.concat(
				paramsFromURL($page.url)
					.getAll('is-part-of-measure')
					.map(
						(o): PartialRelation => ({
							object: Number(o),
							position: 0,
							predicate: 'is-part-of-measure'
						})
					)
			);
	}

	let assignee = container.payload.assignee;
	$: container.payload.assignee = assignee == '' ? undefined : assignee;

	let taskCategory: TaskCategory | '' | undefined = container.payload.taskCategory;
	$: container.payload.taskCategory = taskCategory == '' ? undefined : taskCategory;
</script>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<OrganizationSelector bind:container />

	<MeasureRelationSelector bind:container />
</fieldset>

<fieldset class="form-tab" id="basic-data">
	<legend>{$_('form.basic_data')}</legend>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}

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
					{#if display_name !== ''}
						<option value={guid} selected={guid === assignee}>
							{display_name}
						</option>
					{/if}
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
