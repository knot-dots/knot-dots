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
	import { payloadTypes, predicates } from '$lib/models';
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
			{#each columns as column (column.title)}
				<BoardColumn
					addItemUrl={(column.title === 'programs' || column.title.includes('goals')) &&
					$mayCreateContainer(
						payloadTypes.enum.strategy,
						data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
					)
						? `#create=${column.payloadType[0]}`
						: undefined}
					title={$_(column.title)}
				>
					<MaybeDragZone
						containers={data.containers
							.filter(
								(c) =>
									column.payloadType.findIndex((payloadType) => payloadType === c.payload.type) > -1
							)
							.slice(0, browser ? undefined : 10)}
					/>
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
