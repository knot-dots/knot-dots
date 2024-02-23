<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import RelationFilter from '$lib/components/RelationFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { status } from '$lib/models';
	import { statusBackgrounds, statusHoverColors, statusIcons } from '$lib/theme/models';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<Sidebar helpSlug="measures" slot="sidebar">
		<Search slot="search" />

		<svelte:fragment slot="filters">
			{#if $page.url.searchParams.has('related-to')}
				<RelationFilter />
			{/if}
			<StrategyTypeFilter />
			<TopicFilter />
			<CategoryFilter />
			<AudienceFilter />
		</svelte:fragment>

		<Sort slot="sort" />
	</Sidebar>

	<svelte:fragment slot="main">
		<Board>
			{#each status.options as statusOption}
				<BoardColumn
					--background={statusBackgrounds.get(statusOption)}
					--hover-border-color={statusHoverColors.get(statusOption)}
					icon={statusIcons.get(statusOption)}
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
</Layout>
