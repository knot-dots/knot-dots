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
	import type { EmptyTaskContainer, TaskContainer, User } from '$lib/models';
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
</script>

<fieldset class="form-tab" id="basic-data">
	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<label class="meta">
		<span class="meta-key">{$_('task_status.label')}</span>
		<select class="meta-value" name="status" bind:value={container.payload.taskStatus} required>
			{#each taskStatus.options as statusOption}
				<option value={statusOption} selected={statusOption === statusParam}>
					{$_(statusOption)}
				</option>
			{/each}
		</select>
	</label>

	<label class="meta">
		<span class="meta-key">{$_('assignee')}</span>
		<select class="meta-value" name="assignee" bind:value={container.payload.assignee}>
			<option value={undefined}></option>
			{#await membersPromise then members}
				{#each members as { display_name, guid }}
					{#if display_name !== ''}
						<option value={guid}>
							{display_name}
						</option>
					{/if}
				{/each}
			{/await}
		</select>
	</label>

	<label class="meta">
		<span class="meta-key">{$_('task_category.label')}</span>
		<select class="meta-value" name="taskCategory" bind:value={container.payload.taskCategory}>
			<option value={undefined}></option>
			{#each taskCategories.options as taskCategoryOption}
				<option value={taskCategoryOption}>
					{$_(taskCategoryOption)}
				</option>
			{/each}
		</select>
	</label>

	<label class="meta">
		<span class="meta-key">{$_('fulfillment_date')}</span>
		<input class="meta-value" type="date" bind:value={container.payload.fulfillmentDate} />
	</label>

	<MeasureRelationSelector bind:container />

	<OrganizationSelector bind:container />
</fieldset>
