<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import RelationTypeFilter from '$lib/components/RelationTypeFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { levels, payloadTypes } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<Sidebar helpSlug="strategies" slot="sidebar">
		<Search slot="search" />

		<svelte:fragment slot="filters">
			<AudienceFilter />
			{#if $page.url.searchParams.has('related-to')}
				<RelationTypeFilter />
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
					addItemUrl={$mayCreateContainer(payloadTypes.enum.strategy)
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
