<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import RelationTypeFilter from '$lib/components/RelationTypeFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { payloadTypes } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);

	const columns = [
		{ title: 'programs', payloadType: [payloadTypes.enum.strategy] },
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
	<Sidebar helpSlug="objectives" slot="sidebar">
		<Search slot="search" />

		<svelte:fragment slot="filters">
			{#if $page.url.searchParams.has('related-to')}
				<RelationTypeFilter />
			{/if}
			<AudienceFilter />
			{#if !$page.data.currentOrganization.payload.default}
				<OrganizationIncludedFilter />
			{/if}
			<CategoryFilter />
			<TopicFilter />
			<StrategyTypeFilter />
		</svelte:fragment>

		<Sort slot="sort" />
	</Sidebar>

	<svelte:fragment slot="main">
		<Board>
			{#each columns as column (column.title)}
				<BoardColumn
					addItemUrl={column.title === 'programs' && $mayCreateContainer(payloadTypes.enum.strategy)
						? `#create=${payloadTypes.enum.strategy}`
						: undefined}
					title={$_(column.title)}
				>
					<MaybeDragZone
						containers={data.containers.filter(
							(c) =>
								column.payloadType.findIndex((payloadType) => payloadType === c.payload.type) > -1
						)}
					/>
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
