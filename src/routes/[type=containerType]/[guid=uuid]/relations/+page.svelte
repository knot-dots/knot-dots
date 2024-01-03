<script lang="ts">
	import { InformationCircle, Share } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureTabs from '$lib/components/MeasureTabs.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTabs from '$lib/components/StrategyTabs.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import {
		isInternalObjectiveContainer,
		isMeasureContainer,
		isPartOf,
		isStrategyContainer,
		payloadTypes
	} from '$lib/models';
	import { overlay, sidebarToggle } from '$lib/stores';
	import type { PageData } from './$types';
	import RelationFilter from '$lib/components/RelationFilter.svelte';

	export let data: PageData;

	const columns = isInternalObjectiveContainer(data.container)
		? [
				{
					title: 'internal_objective.internal_strategies',
					payloadType: payloadTypes.enum['internal_objective.internal_strategy']
				},
				{
					title: 'internal_objective.visions',
					payloadType: payloadTypes.enum['internal_objective.vision']
				},
				{
					title: 'internal_objective.strategic_goals',
					payloadType: payloadTypes.enum['internal_objective.strategic_goal']
				},
				{
					title: 'internal_objective.milestones',
					payloadType: payloadTypes.enum['internal_objective.milestone']
				},
				{
					title: 'internal_objective.tasks',
					payloadType: payloadTypes.enum['internal_objective.task']
				}
		  ]
		: [
				{ title: 'strategies', payloadType: payloadTypes.enum.strategy },
				{ title: 'models', payloadType: payloadTypes.enum.model },
				{ title: 'strategic_goals', payloadType: payloadTypes.enum.strategic_goal },
				{ title: 'operational_goals', payloadType: payloadTypes.enum.operational_goal },
				{ title: 'measures', payloadType: payloadTypes.enum.measure }
		  ];
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		{#if isMeasureContainer(data.container)}
			<Sidebar>
				<MeasureTabs container={data.container} slot="tabs" />

				<Search
					slot="search"
					let:toggleSidebar
					on:click={$sidebarToggle ? undefined : toggleSidebar}
				/>

				<svelte:fragment slot="filters">
					<RelationFilter />
					<StrategyTypeFilter />
					<TopicFilter />
					<CategoryFilter />
				</svelte:fragment>

				<Sort slot="sort" />
			</Sidebar>
		{:else if isStrategyContainer(data.container)}
			<Sidebar>
				<StrategyTabs container={data.container} slot="tabs" />

				<Search
					slot="search"
					let:toggleSidebar
					on:click={$sidebarToggle ? undefined : toggleSidebar}
				/>

				<svelte:fragment slot="filters">
					<RelationFilter />
					<StrategyTypeFilter />
					<TopicFilter />
					<CategoryFilter />
				</svelte:fragment>

				<Sort slot="sort" />
			</Sidebar>
		{:else}
			<Sidebar>
				<svelte:fragment slot="tabs">
					<SidebarTab
						href="/{data.container.payload.type}/{data.container.guid}"
						iconSource={InformationCircle}
						text={$_('information')}
					/>
					<SidebarTab
						href="/{data.container.payload.type}/{data.container.guid}/relations"
						iconSource={Share}
						text={$_('relations')}
					/>
				</svelte:fragment>

				<Search
					slot="search"
					let:toggleSidebar
					on:click={$sidebarToggle ? undefined : toggleSidebar}
				/>

				<svelte:fragment slot="filters">
					<RelationFilter />
					<StrategyTypeFilter />
					<TopicFilter />
					<CategoryFilter />
				</svelte:fragment>

				<Sort slot="sort" />
			</Sidebar>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="main">
		<Board>
			{#each columns as column (column.title)}
				<BoardColumn
					addItemUrl={`/${column.payloadType}/new`}
					itemType={column.payloadType}
					title={$_(column.title)}
				>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#each data.containers.filter((c) => c.payload.type === column.payloadType) as container}
							<Card
								{container}
								relatedContainers={data.containersWithIndicatorContributions.filter(isPartOf)}
							/>
						{/each}
					</div>
				</BoardColumn>
			{/each}
		</Board>

		{#if browser && $overlay.revisions.length > 0}
			<Overlay {...$overlay} />
		{/if}
	</svelte:fragment>
</Layout>
