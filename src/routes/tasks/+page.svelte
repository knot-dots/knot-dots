<script lang="ts">
	import AssigneeFilter from '$lib/components/AssigneeFilter.svelte';
	import Board from '$lib/components/Board.svelte';
	import ImplementationWorkspaces from '$lib/components/ImplementationWorkspaces.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import TaskCategoryFilter from '$lib/components/TaskCategoryFilter.svelte';
	import { isTaskContainer, payloadTypes, taskStatus } from '$lib/models';
	import type { TaskContainer } from '$lib/models';
	import { taskStatusBackgrounds, taskStatusHoverColors } from '$lib/theme/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: columns = [
		{
			title: taskStatus.enum['task_status.idea'],
			payloadType: payloadTypes.enum['internal_objective.task'],
			items: data.containers.filter(
				(c) => isTaskContainer(c) && c.payload.taskStatus === taskStatus.enum['task_status.idea']
			) as TaskContainer[]
		},
		{
			title: taskStatus.enum['task_status.in_planning'],
			payloadType: payloadTypes.enum['internal_objective.task'],
			items: data.containers.filter(
				(c) =>
					isTaskContainer(c) && c.payload.taskStatus === taskStatus.enum['task_status.in_planning']
			) as TaskContainer[]
		},
		{
			title: taskStatus.enum['task_status.in_progress'],
			payloadType: payloadTypes.enum['internal_objective.task'],
			items: data.containers.filter(
				(c) =>
					isTaskContainer(c) && c.payload.taskStatus === taskStatus.enum['task_status.in_progress']
			) as TaskContainer[]
		},
		{
			title: taskStatus.enum['task_status.done'],
			payloadType: payloadTypes.enum['internal_objective.task'],
			items: data.containers.filter(
				(c) => isTaskContainer(c) && c.payload.taskStatus === taskStatus.enum['task_status.done']
			) as TaskContainer[]
		}
	];
</script>

<Layout>
	<Sidebar helpSlug="tasks" slot="sidebar">
		<Search slot="search" />

		<ImplementationWorkspaces slot="workspaces" />

		<svelte:fragment slot="filters">
			<OrganizationIncludedFilter />
			<TaskCategoryFilter />
			<AssigneeFilter />
		</svelte:fragment>
	</Sidebar>

	<svelte:fragment slot="main">
		<Board>
			{#each columns as column (column.title)}
				<TaskBoardColumn
					--background={taskStatusBackgrounds.get(column.title)}
					--hover-border-color={taskStatusHoverColors.get(column.title)}
					addItemUrl="#create={column.payloadType}&taskStatus={column.title}"
					items={column.items}
					status={column.title}
				/>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
