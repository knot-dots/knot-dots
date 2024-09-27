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
	import MeasureTypeFilter from '$lib/components/MeasureTypeFilter.svelte';
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
	import { payloadTypes, predicates, status } from '$lib/models';
	import { mayCreateContainer, overlay } from '$lib/stores';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		{#if !$page.data.currentOrganization.payload.default}
			<Sidebar helpSlug="measures">
				<Search slot="search" />

				<svelte:fragment slot="filters">
					{#if $page.url.searchParams.has('related-to')}
						<RelationTypeFilter />
					{/if}
					<AudienceFilter />
					<OrganizationIncludedFilter />
					<CategoryFilter />
					<TopicFilter />
					<MeasureTypeFilter />
					<StrategyTypeFilter />
				</svelte:fragment>

				<Sort slot="sort" />
			</Sidebar>
		{:else}
			<Sidebar helpSlug="measures">
				<Search slot="search" />

				<svelte:fragment slot="filters">
					{#if $page.url.searchParams.has('related-to')}
						<RelationTypeFilter />
					{/if}
					<AudienceFilter />
					<CategoryFilter />
					<MeasureTypeFilter />
					<TopicFilter />
					<StrategyTypeFilter />
				</svelte:fragment>

				<Sort slot="sort" />
			</Sidebar>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="main">
		<Board>
			{#each status.options as statusOption}
				<BoardColumn
					--background={statusBackgrounds.get(statusOption)}
					--hover-border-color={statusHoverColors.get(statusOption)}
					addItemUrl={$mayCreateContainer(payloadTypes.enum.measure)
						? `#create=measure&status=${statusOption}`
						: undefined}
					title={$_(statusOption)}
				>
					<MaybeDragZone
						containers={data.containers.filter(
							(c) => 'status' in c.payload && c.payload.status === statusOption
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
						predicates.enum['is-prerequisite-for']
					]}
				/>
			{/if}
		{:else if $overlay.object}
			<RelationOverlay object={$overlay.object} />
		{/if}
	</svelte:fragment>
</Layout>
