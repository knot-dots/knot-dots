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
	import NewRelationOverlay from '$lib/components/NewRelationOverlay.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import RelationTypeFilter from '$lib/components/RelationTypeFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { levels, payloadTypes, predicates } from '$lib/models';
	import { mayCreateContainer, overlay } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<Sidebar helpSlug="programs-by-level" slot="sidebar">
		<Search slot="search" />

		<svelte:fragment slot="filters">
			{#if $page.url.searchParams.has('related-to')}
				{#if createFeatureDecisions(data.features).useNewRelationTypeFilter()}
					<RelationTypeFilter
						enabledPredicates={[
							predicates.enum['is-consistent-with'],
							predicates.enum['is-equivalent-to'],
							predicates.enum['is-inconsistent-with'],
							predicates.enum['is-superordinate-of']
						]}
					/>
				{:else}
					<RelationTypeFilter />
				{/if}
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
			{#each levels.options.filter((l) => l !== levels.enum['level.regional']) as levelOption}
				<BoardColumn
					addItemUrl={$mayCreateContainer(
						payloadTypes.enum.strategy,
						data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
					)
						? `#create=strategy&level=${levelOption}`
						: undefined}
					title={$_(levelOption)}
				>
					<MaybeDragZone
						containers={data.containers.filter(
							(c) => 'level' in c.payload && c.payload.level === levelOption
						)}
					/>
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
						predicates.enum['is-inconsistent-with'],
						predicates.enum['is-superordinate-of']
					]}
				/>
			{/if}
		{:else if $overlay.object}
			<RelationOverlay object={$overlay.object} />
		{/if}
	</svelte:fragment>
</Layout>
