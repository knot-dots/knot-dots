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
	import TasksPage from '$lib/components/TasksPage.svelte';
	import {
		type GoalContainer,
		isTaskContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		status
	} from '$lib/models';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainer,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

	function goalsColumnTitle(containers: GoalContainer[]) {
		const goalTypes = new Set(containers.map((c) => c.payload.goalType).filter(Boolean));

		if (goalTypes.size == 1) {
			return $_(`${goalTypes.values().next().value}.plural`);
		} else {
			return $_('goals');
		}
	}
</script>

<TasksPage data={{ ...data, containers }} sortOptions={[]}>
	<Board>
		{#if data.relatedContainers.length > 0}
			<BoardColumn
				--background="white"
				--border="solid 1px var(--color-gray-900)"
				title={goalsColumnTitle(data.relatedContainers)}
			>
				<div class="vertical-scroll-wrapper">
					{#each data.relatedContainers as container (container.guid)}
						<Card {container} showRelationFilter />
					{/each}
				</div>
			</BoardColumn>
		{/if}
		{#each status.options.filter((s) => s !== 'status.in_operation') as taskStatusOption (taskStatusOption)}
			{#if paramsFromFragment(page.url).has(overlayKey.enum['relations'])}
				<BoardColumn
					--background={statusBackgrounds.get(taskStatusOption)}
					--hover-border-color={statusHoverColors.get(taskStatusOption)}
					addItemUrl={`#create=${payloadTypes.enum.task}&status=${taskStatusOption}`}
					title={$_(taskStatusOption)}
				>
					<MaybeDragZone
						containers={containers
							.filter(isTaskContainer)
							.filter(({ payload }) => payload.status === taskStatusOption)}
					/>
				</BoardColumn>
			{:else}
				<TaskBoardColumn
					--background={statusBackgrounds.get(taskStatusOption)}
					--hover-border-color={statusHoverColors.get(taskStatusOption)}
					addItemUrl={`#create=${payloadTypes.enum.task}&status=${taskStatusOption}`}
					items={containers
						.filter(isTaskContainer)
						.filter(({ payload }) => payload.status === taskStatusOption)}
					onSort={(items) => {
						data.containers = [
							...data.containers.filter(
								({ guid }) => !items.some(({ guid: itemGuid }) => guid === itemGuid)
							),
							...items
						];
					}}
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
