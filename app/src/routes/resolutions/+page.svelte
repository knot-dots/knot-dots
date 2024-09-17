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
	import { payloadTypes, resolutionStatus } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { resolutionStatusBackgrounds, resolutionStatusHoverColors } from '$lib/theme/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		{#if !$page.data.currentOrganization.payload.default}
			<Sidebar helpSlug="resolutions">
				<Search slot="search" />

				<svelte:fragment slot="filters">
					<AudienceFilter />
					<OrganizationIncludedFilter />
					<CategoryFilter />
					<TopicFilter />
					<StrategyTypeFilter />
				</svelte:fragment>

				<Sort slot="sort" />
			</Sidebar>
		{:else}
			<Sidebar helpSlug="resolutions">
				<Search slot="search" />

				<svelte:fragment slot="filters">
					<AudienceFilter />
					<CategoryFilter />
					<TopicFilter />
					<StrategyTypeFilter />
				</svelte:fragment>

				<Sort slot="sort" />
			</Sidebar>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="main">
		<Board>
			{#each resolutionStatus.options as statusOption}
				<BoardColumn
					--background={resolutionStatusBackgrounds.get(statusOption)}
					--hover-border-color={resolutionStatusHoverColors.get(statusOption)}
					addItemUrl={$mayCreateContainer(payloadTypes.enum.measure)
						? `#create=resolution&resolutionStatus=${statusOption}`
						: undefined}
					title={$_(statusOption)}
				>
					<MaybeDragZone
						containers={data.containers.filter(
							(c) => 'resolutionStatus' in c.payload && c.payload.resolutionStatus === statusOption
						)}
					/>
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
