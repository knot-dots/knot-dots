<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import AssigneeFilter from '$lib/components/AssigneeFilter.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import TaskCategoryFilter from '$lib/components/TaskCategoryFilter.svelte';
	import {
		isTaskContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates,
		taskStatus
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { taskStatusBackgrounds, taskStatusHoverColors } from '$lib/theme/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for'], predicates.enum['is-subtask-of']]
	});
</script>

<Layout>
	<Sidebar helpSlug="tasks" slot="sidebar">
		<Search slot="search" />

		<svelte:fragment slot="filters">
			<OrganizationIncludedFilter />
			<TaskCategoryFilter />
			<AssigneeFilter />
		</svelte:fragment>
	</Sidebar>

	<svelte:fragment slot="main">
		<Board>
			{#if data.relatedContainers.length > 0}
				<BoardColumn
					--background="white"
					--border="solid 1px var(--color-gray-900)"
					title={$_('goals_and_measure_results_and_milestones')}
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
