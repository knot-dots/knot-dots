<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import {
		type GoalContainer,
		isTaskContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		taskStatus
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { taskStatusBackgrounds, taskStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';
	import TasksPage from '$lib/components/TasksPage.svelte';

	let { data }: PageProps = $props();

	function goalsColumnTitle(containers: GoalContainer[]) {
		const goalTypes = new Set(containers.map((c) => c.payload.goalType).filter(Boolean));

		if (goalTypes.size == 1) {
			return $_(`${goalTypes.values().next().value}.plural`);
		} else {
			return $_('goals');
		}
	}
</script>

<TasksPage {data} sortOptions={[]}>
	<Board>
		{#if data.relatedContainers.length > 0}
			<BoardColumn
				--background="white"
				--border="solid 1px var(--color-gray-900)"
				title={goalsColumnTitle(data.relatedContainers)}
			>
				<div class="vertical-scroll-wrapper masked-overflow">
					{#each data.relatedContainers as container}
						<Card {container} showRelationFilter />
					{/each}
				</div>
			</BoardColumn>
		{/if}
		{#each taskStatus.options as taskStatusOption}
			{#if paramsFromFragment(page.url).has(overlayKey.enum['relations'])}
				<BoardColumn
					--background={taskStatusBackgrounds.get(taskStatusOption)}
					--hover-border-color={taskStatusHoverColors.get(taskStatusOption)}
					addItemUrl={`#create=${payloadTypes.enum.task}&taskStatus=${taskStatusOption}`}
					title={$_(taskStatusOption)}
				>
					<MaybeDragZone
						containers={data.containers
							.filter(isTaskContainer)
							.filter(({ payload }) => payload.taskStatus === taskStatusOption)}
					/>
				</BoardColumn>
			{:else}
				<TaskBoardColumn
					--background={taskStatusBackgrounds.get(taskStatusOption)}
					--hover-border-color={taskStatusHoverColors.get(taskStatusOption)}
					addItemUrl={$mayCreateContainer(
						payloadTypes.enum.task,
						data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
					)
						? `#create=${payloadTypes.enum.task}&taskStatus=${taskStatusOption}`
						: undefined}
					items={data.containers
						.filter(isTaskContainer)
						.filter(({ payload }) => payload.taskStatus === taskStatusOption)}
					status={taskStatusOption}
				>
					{#snippet itemSnippet(container)}
						<TaskCard {container} showRelationFilter />
					{/snippet}
				</TaskBoardColumn>
			{/if}
		{/each}
	</Board>
	<Help slug="tasks-status" />
</TasksPage>
