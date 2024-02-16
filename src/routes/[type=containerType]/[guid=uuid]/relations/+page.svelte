<script lang="ts">
	import { InformationCircle, Share } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureTabs from '$lib/components/MeasureTabs.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTabs from '$lib/components/StrategyTabs.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { isMeasureContainer, isPartOf, isStrategyContainer, payloadTypes } from '$lib/models';
	import { mayCreateContainer, sidebarToggle } from '$lib/stores';
	import type { PageData } from './$types';
	import RelationFilter from '$lib/components/RelationFilter.svelte';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';

	export let data: PageData;

	const columns = [
		{ title: 'strategies', payloadType: [payloadTypes.enum.strategy] },
		{
			title: 'payload_group.long_term_goals',
			payloadType: [payloadTypes.enum.model, payloadTypes.enum['internal_objective.vision']]
		},
		{ title: 'payload_group.strategic_goals', payloadType: [payloadTypes.enum.strategic_goal] },
		{
			title: 'payload_group.measurable_goals',
			payloadType: [
				payloadTypes.enum.operational_goal,
				payloadTypes.enum['internal_objective.milestone']
			]
		},
		{
			title: 'payload_group.implementation',
			payloadType: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
		}
	];
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		{#if isMeasureContainer(data.container)}
			<Sidebar helpSlug="relations">
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
					<AudienceFilter />
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
					addItemUrl={column.title === 'strategies' &&
					$mayCreateContainer(payloadTypes.enum.strategy)
						? `#create=${column.payloadType}`
						: undefined}
					title={$_(column.title)}
				>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#each data.containers.filter((c) => column.payloadType.findIndex((payloadType) => payloadType === c.payload.type) > -1) as container}
							<Card
								{container}
								relatedContainers={data.containersWithIndicatorContributions.filter(isPartOf)}
							/>
						{/each}
					</div>
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
