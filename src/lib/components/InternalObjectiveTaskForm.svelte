<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import InternalObjectiveForm from '$lib/components/InternalObjectiveForm.svelte';
	import { taskCategories, taskStatus } from '$lib/models';
	import type {
		AnyContainer,
		EmptyTaskContainer,
		TaskCategory,
		TaskContainer,
		User
	} from '$lib/models';

	export let container: TaskContainer | EmptyTaskContainer;
	export let isPartOfOptions: AnyContainer[];

	let membersPromise: Promise<User[]> = new Promise(() => []);

	onMount(() => {
		membersPromise = fetchMembers(
			$page.data.currentOrganizationalUnit?.guid ?? $page.data.currentOrganization.guid
		);
	});

	let statusParam = $page.url.searchParams.get('task-status');

	let assignee = container.payload.assignee;
	$: container.payload.assignee = assignee == '' ? undefined : assignee;

	let taskCategory: TaskCategory | '' | undefined = container.payload.taskCategory;
	$: container.payload.taskCategory = taskCategory == '' ? undefined : taskCategory;
</script>

<InternalObjectiveForm {container} {isPartOfOptions} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="extra-data">
		<label>
			<select name="status" bind:value={container.payload.taskStatus} required>
				{#each taskStatus.options as statusOption}
					<option value={statusOption} selected={statusOption === statusParam}>
						{$_(statusOption)}
					</option>
				{/each}
			</select>
		</label>
	</svelte:fragment>

	<svelte:fragment slot="extra-meta">
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
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</InternalObjectiveForm>
