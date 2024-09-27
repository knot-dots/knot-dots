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
	import NewRelationOverlay from '$lib/components/NewRelationOverlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import RelationTypeFilter from '$lib/components/RelationTypeFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { payloadTypes, predicates } from '$lib/models';
	import { mayCreateContainer, overlay } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);

	const columns = [
		{ title: 'programs', payloadType: [payloadTypes.enum.strategy] },
		{
			title: 'payload_group.long_term_goals',
			payloadType: [payloadTypes.enum.model, payloadTypes.enum.vision]
		},
		{ title: 'payload_group.strategic_goals', payloadType: [payloadTypes.enum.strategic_goal] },
		{
			title: 'payload_group.measurable_goals',
			payloadType: [payloadTypes.enum.operational_goal]
		},
		{
			title: 'payload_group.implementation',
			payloadType: [
				payloadTypes.enum.measure,
				payloadTypes.enum.simple_measure,
				payloadTypes.enum.resolution
			]
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
					{#await data.containers then containers}
						<MaybeDragZone
							containers={containers.filter(
								(c) =>
									column.payloadType.findIndex((payloadType) => payloadType === c.payload.type) > -1
							)}
						/>
					{/await}
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>

	<svelte:fragment slot="relationOverlay">
		{#if createFeatureDecisions(data.features).useNewRelationOverlay()}
			{#if $overlay.object}
				<NewRelationOverlay
					object={$overlay.object}
					enabledPredicates={[
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with']
					]}
				/>
			{/if}
		{:else if $overlay.object}
			<RelationOverlay object={$overlay.object} />
		{/if}
	</svelte:fragment>
</Layout>
