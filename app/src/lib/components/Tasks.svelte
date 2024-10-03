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
	import { mayCreateContainer } from '$lib/stores';
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

	function sortByTitle(a: Container, b: Container) {
		const titleA = a.payload.title.toUpperCase();
		const titleB = b.payload.title.toUpperCase();
		if (titleA < titleB) {
			return -1;
		}
		if (titleA > titleB) {
			return 1;
		}
		return 0;
	}
</script>

<Board>
	{#if relatedContainers.length > 0}
		<BoardColumn
			--background="white"
			--border="solid 1px var(--color-gray-900)"
			title={$_('measure_results_and_milestones')}
		>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each relatedContainers.sort(sortByTitle) as container}
					<Card {container} showRelationFilter />
				{/each}
			</div>
		</BoardColumn>
	{/if}
	{#each columns as column (column.title)}
		<TaskBoardColumn
			--background={taskStatusBackgrounds.get(column.title)}
			--hover-border-color={taskStatusHoverColors.get(column.title)}
			addItemUrl={container && $mayCreateContainer(payloadTypes.enum.task, container.managed_by)
				? `#create=${column.payloadType}&is-part-of-measure=${container.revision}&managed-by=${container.managed_by}&taskStatus=${column.title}`
				: undefined}
			items={column.items}
			status={column.title}
			let:container
		>
			<Card {container} showRelationFilter={relatedContainers.length > 0} />
		</TaskBoardColumn>
	{/each}
</Board>
