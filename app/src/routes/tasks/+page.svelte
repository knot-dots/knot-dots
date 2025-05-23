<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import {
		computeFacetCount,
		type GoalContainer,
		isTaskContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates,
		taskCategories,
		taskStatus
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { taskStatusBackgrounds, taskStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for'], predicates.enum['is-subtask-of']]
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))],
			['assignee', new Map()]
		]);

		return computeFacetCount(facets, data.containers);
	});

	function goalsColumnTitle(containers: GoalContainer[]) {
		const goalTypes = new Set(containers.map((c) => c.payload.goalType).filter(Boolean));

		if (goalTypes.size == 1) {
			return $_(`${goalTypes.values().next().value}.plural`);
		} else {
			return $_('goals');
		}
	}
</script>

<Layout>
	<Header {facets} sortOptions={[]} slot="header" />

	<svelte:fragment slot="main">
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
						addItemUrl={$mayCreateContainer(
							payloadTypes.enum.task,
							data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
						)
							? `#create=${payloadTypes.enum.task}&taskStatus=${taskStatusOption}`
							: undefined}
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
						let:container
					>
						<TaskCard {container} showRelationFilter />
					</TaskBoardColumn>
				{/if}
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
