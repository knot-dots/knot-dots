<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
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
	import {
		computeColumnTitleForGoals,
		goalsByHierarchyLevel,
		isGoalContainer,
		isStrategyContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['contributes-to']
		]
	});

	$: goals = goalsByHierarchyLevel(
		data.containers
			.filter(isGoalContainer)
			.filter(({ relation }) =>
				relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-strategy'])
			)
	);

	$: columns = [
		{
			addItemUrl: '#create=strategy',
			containers: data.containers.filter(isStrategyContainer).slice(0, browser ? undefined : 10),
			key: 'programs',
			title: $_('programs')
		},
		...Array.from(goals.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => ({
				addItemUrl: `#create=goal&hierarchyLevel=${hierarchyLevel}`,
				containers: containers.slice(0, browser ? undefined : 10),
				key: `goals-${hierarchyLevel}`,
				title: computeColumnTitleForGoals(containers)
			})),
		{
			addItemUrl: undefined,
			containers: data.containers
				.filter(
					(c) =>
						[
							payloadTypes.enum.measure,
							payloadTypes.enum.resolution,
							payloadTypes.enum.simple_measure
						].findIndex((payloadType) => payloadType === c.payload.type) > -1
				)
				.slice(0, browser ? undefined : 10),
			key: 'implementation',
			title: $_('payload_group.implementation')
		}
	];
</script>

<Layout>
	<Sidebar helpSlug="objectives" slot="sidebar">
		<Search slot="search" />

		<svelte:fragment slot="filters">
			{#if $page.url.searchParams.has('related-to')}
				<RelationTypeFilter
					enabledPredicates={[
						predicates.enum['is-part-of'],
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with'],
						predicates.enum['contributes-to']
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
			{#each columns as column (column.key)}
				<BoardColumn
					addItemUrl={column.addItemUrl &&
					$mayCreateContainer(
						payloadTypes.enum.strategy,
						data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
					)
						? column.addItemUrl
						: undefined}
					title={column.title}
				>
					<MaybeDragZone containers={column.containers} />
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
