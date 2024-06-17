<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import {
		type AnyContainer,
		type Container,
		payloadTypes,
		type TaskContainer,
		taskStatus
	} from '$lib/models';
	import { taskStatusBackgrounds, taskStatusHoverColors } from '$lib/theme/models';

	export let container: AnyContainer | undefined = undefined;
	export let containers: TaskContainer[];
	export let relatedContainers: Container[] = [];

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
	{#if relatedContainers.length}
		<BoardColumn
			--background="white"
			--border="solid 1px var(--color-gray-900)"
			title={$_('implementation_planning')}
		>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each relatedContainers as container}
					<Card {container} showRelationFilter />
				{/each}
			</div>
		</BoardColumn>
	{/if}
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
