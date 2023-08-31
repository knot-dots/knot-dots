<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import {
		isPartOf,
		isTaskContainer,
		payloadTypes,
		taskStatusColors,
		taskStatusIcons
	} from '$lib/models';
	import type { TaskStatus } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	const columns: { title: TaskStatus; payloadType: string }[] = [
		{
			title: 'task_status.idea',
			payloadType: payloadTypes.enum['internal_objective.task']
		},
		{
			title: 'task_status.in_planning',
			payloadType: payloadTypes.enum['internal_objective.task']
		},
		{
			title: 'task_status.in_progress',
			payloadType: payloadTypes.enum['internal_objective.task']
		},
		{
			title: 'task_status.done',
			payloadType: payloadTypes.enum['internal_objective.task']
		}
	];
</script>

<Board>
	{#each columns as column (column.title)}
		<BoardColumn
			--bg-color="var(--color-{taskStatusColors.get(column.title)}-050)"
			title={$_(column.title)}
			addItemUrl={`/${column.payloadType}/new/?is-part-of-measure=${data.container.revision}&task-status=${column.title}`}
			icon={taskStatusIcons.get(column.title)}
		>
			{#each data.containers.filter((c) => isTaskContainer(c) && c.payload.taskStatus === column.title) as container}
				<Card {container} relatedContainers={data.containers.filter(isPartOf)} />
			{/each}
		</BoardColumn>
	{/each}
</Board>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}
