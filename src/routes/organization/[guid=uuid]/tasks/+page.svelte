<script lang="ts">
	import Board from '$lib/components/Board.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import { isTaskContainer, payloadTypes, taskStatus } from '$lib/models';
	import type { TaskContainer, TaskStatus } from '$lib/models';
	import { taskStatusColors, taskStatusIcons } from '$lib/theme/models';
	import type { PageData } from './$types';

	export let data: PageData;

	type Column = { title: TaskStatus; payloadType: string; items: TaskContainer[] };

	const columns: Column[] = [
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
			--bg-color="var(--color-{taskStatusColors.get(column.title)}-050)"
			addItemUrl={`/${column.payloadType}/new/?task-status=${column.title}`}
			icon={taskStatusIcons.get(column.title)}
			items={column.items}
			status={column.title}
		/>
	{/each}
</Board>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}
