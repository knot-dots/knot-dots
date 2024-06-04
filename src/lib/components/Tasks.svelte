<script lang="ts">
	import Board from '$lib/components/Board.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import { type AnyContainer, payloadTypes, type TaskContainer, taskStatus } from '$lib/models';
	import { taskStatusBackgrounds, taskStatusHoverColors } from '$lib/theme/models';

	export let container: AnyContainer | undefined = undefined;
	export let containers: TaskContainer[];

	$: columns = [
		{
			title: taskStatus.enum['task_status.idea'],
			payloadType: payloadTypes.enum.task,
			items: containers.filter((c) => c.payload.taskStatus === taskStatus.enum['task_status.idea'])
		},
		{
			title: taskStatus.enum['task_status.in_planning'],
			payloadType: payloadTypes.enum.task,
			items: containers.filter(
				(c) => c.payload.taskStatus === taskStatus.enum['task_status.in_planning']
			)
		},
		{
			title: taskStatus.enum['task_status.in_progress'],
			payloadType: payloadTypes.enum.task,
			items: containers.filter(
				(c) => c.payload.taskStatus === taskStatus.enum['task_status.in_progress']
			)
		},
		{
			title: taskStatus.enum['task_status.done'],
			payloadType: payloadTypes.enum.task,
			items: containers.filter((c) => c.payload.taskStatus === taskStatus.enum['task_status.done'])
		}
	];
</script>

<Board>
	{#each columns as column (column.title)}
		<TaskBoardColumn
			--background={taskStatusBackgrounds.get(column.title)}
			--hover-border-color={taskStatusHoverColors.get(column.title)}
			addItemUrl={container
				? `#create=${column.payloadType}&is-part-of-measure=${container.revision}&taskStatus=${column.title}`
				: undefined}
			items={column.items}
			status={column.title}
		/>
	{/each}
</Board>
