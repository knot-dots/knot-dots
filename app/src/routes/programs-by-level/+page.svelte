<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Filter from '$lib/components/Filter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import PolicyFieldBNKFilter from '$lib/components/PolicyFieldBNKFilter.svelte';
	import RelationTypeFilter from '$lib/components/RelationTypeFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { levels, payloadTypes, predicates } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-superordinate-of']
		]
	});
</script>

<Layout>
	<Sidebar helpSlug="programs-by-level" slot="sidebar">
		<Search slot="search" />

		<svelte:fragment slot="filters">
			{#if !$page.data.currentOrganization.payload.default && !$page.url.searchParams.has('related-to')}
				<Filter
					initialValue={['only_related']}
					key="programs"
					options={[[$_(`programs_by_level_filter.only_related`), 'only_related']]}
				/>
			{/if}
			{#if $page.url.searchParams.has('related-to')}
				<RelationTypeFilter
					enabledPredicates={[
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with'],
						predicates.enum['is-superordinate-of']
					]}
				/>
			{/if}
			<AudienceFilter />
			{#if !$page.data.currentOrganization.payload.default}
				<OrganizationIncludedFilter />
			{/if}
			<CategoryFilter />
			<TopicFilter />
			<PolicyFieldBNKFilter />
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
</Layout>
