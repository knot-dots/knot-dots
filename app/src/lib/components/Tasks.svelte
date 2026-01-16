<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import {
		type AnyContainer,
		type Container,
		type GoalContainer,
		payloadTypes,
		type TaskContainer,
		taskStatus
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { taskStatusBackgrounds, taskStatusHoverColors } from '$lib/theme/models';

	interface Props {
		container?: AnyContainer;
		containers: TaskContainer[];
		relatedContainers?: GoalContainer[];
	}

	let { container, containers, relatedContainers = [] }: Props = $props();

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

	function goalsColumnTitle(containers: GoalContainer[]) {
		const goalTypes = new Set(containers.map((c) => c.payload.goalType).filter(Boolean));

		if (goalTypes.size == 1) {
			return $_(`${goalTypes.values().next().value}.plural`);
		} else {
			return $_('goals');
		}
	}
</script>

<Board>
	{#if relatedContainers.length > 0}
		<BoardColumn
			--background="white"
			--border="solid 1px var(--color-gray-900)"
			title={goalsColumnTitle(relatedContainers)}
		>
			<div class="vertical-scroll-wrapper">
				{#each relatedContainers.sort(sortByTitle) as container (container.guid)}
					<Card {container} showRelationFilter />
				{/each}
			</div>
		</BoardColumn>
	{/if}
	{#each taskStatus.options as taskStatusOption (taskStatusOption)}
		<TaskBoardColumn
			--background={taskStatusBackgrounds.get(taskStatusOption)}
			--hover-border-color={taskStatusHoverColors.get(taskStatusOption)}
			addItemUrl={container && $mayCreateContainer(payloadTypes.enum.task, container.managed_by)
				? `#create=${payloadTypes.enum.task}&is-part-of-measure=${container.guid}&managed-by=${container.managed_by}&taskStatus=${taskStatusOption}`
				: undefined}
			items={containers.filter(({ payload }) => payload.taskStatus === taskStatusOption)}
			status={taskStatusOption}
		>
			{#snippet itemSnippet(container)}
				<TaskCard {container} showRelationFilter />
			{/snippet}
		</TaskBoardColumn>
	{/each}
</Board>
