<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import {
		type Container,
		type GoalContainer,
		isMeasureContainer,
		isSimpleMeasureContainer,
		overlayKey,
		payloadTypes,
		predicates,
		type TaskContainer,
		status,
		type AnyPayload
	} from '$lib/models';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';

	interface Props {
		container?: Container<AnyPayload>;
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

	function addItemUrl(init: string[][]) {
		const params = new URLSearchParams(init);
		return `#${params.toString()}`;
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
	{#each status.options.filter((s) => s !== 'status.in_operation') as taskStatusOption (taskStatusOption)}
		<TaskBoardColumn
			--background={statusBackgrounds.get(taskStatusOption)}
			--hover-border-color={statusHoverColors.get(taskStatusOption)}
			addItemUrl={addItemUrl([
				[overlayKey.enum.create, payloadTypes.enum.task],
				['status', taskStatusOption],
				...(container && (isMeasureContainer(container) || isSimpleMeasureContainer(container))
					? [
							[predicates.enum['is-part-of-measure'], container.guid],
							['managedBy', container.managed_by]
						]
					: [])
			])}
			items={containers.filter(({ payload }) => payload.status === taskStatusOption)}
			status={taskStatusOption}
		>
			{#snippet itemSnippet(container)}
				<TaskCard {container} showRelationFilter />
			{/snippet}
		</TaskBoardColumn>
	{/each}
</Board>
