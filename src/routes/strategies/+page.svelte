<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import RelationFilter from '$lib/components/RelationFilter.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import StrategyTypeFilter from '$lib/components/StrategyTypeFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { levels, payloadTypes } from '$lib/models';
	import { overlay, sidebarToggle } from '$lib/stores';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<Sidebar helpSlug="strategies" slot="sidebar">
		<Search slot="search" let:toggleSidebar on:click={$sidebarToggle ? undefined : toggleSidebar} />

		<svelte:fragment slot="filters">
			{#if $page.url.searchParams.has('related-to')}
				<RelationFilter />
			{/if}
			<StrategyTypeFilter />
			<TopicFilter />
			<CategoryFilter />
		</svelte:fragment>

		<Sort slot="sort" />
	</Sidebar>

	<svelte:fragment slot="main">
		<Board>
			{#each levels.options.filter((l) => l !== levels.enum['level.regional']) as levelOption}
				<BoardColumn
					addItemUrl="#create=strategy&level={levelOption}"
					itemType={payloadTypes.enum.strategy}
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

		{#if browser && $overlay.revisions.length > 0}
			<Overlay {...$overlay} />
		{/if}

		{#if browser && $overlay.object}
			<RelationOverlay object={$overlay.object} />
		{/if}
	</svelte:fragment>
</Layout>
