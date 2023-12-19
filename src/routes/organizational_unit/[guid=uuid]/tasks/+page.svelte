<script lang="ts">
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import { isTaskContainer, payloadTypes, taskStatus } from '$lib/models';
	import type { TaskContainer } from '$lib/models';
	import { taskStatusBackgrounds, taskStatusHoverColors, taskStatusIcons } from '$lib/theme/models';
	import { overlay } from '$lib/stores';
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

<Board>
	{#each columns as column (column.title)}
		<TaskBoardColumn
			--background={taskStatusBackgrounds.get(column.title)}
			--hover-border-color={taskStatusHoverColors.get(column.title)}
			addItemUrl="#create={column.payloadType}&taskStatus={column.title}"
			icon={taskStatusIcons.get(column.title)}
			items={column.items}
			status={column.title}
		/>
	{/each}
</Board>

{#if browser && $overlay.revisions.length > 0}
	<Overlay {...$overlay} />
{/if}
