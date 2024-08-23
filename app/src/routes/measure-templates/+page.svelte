<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import Workspaces from '$lib/components/Workspaces.svelte';
	import type { PageData } from './$types';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import MeasureTypeFilter from '$lib/components/MeasureTypeFilter.svelte';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		<Sidebar helpSlug="measure-templates">
			<Workspaces slot="workspaces" />

			<Search slot="search" />

			<svelte:fragment slot="filters">
				<AudienceFilter />
				<OrganizationIncludedFilter />
				<CategoryFilter />
				<MeasureTypeFilter />
				<TopicFilter />
			</svelte:fragment>

			<Sort slot="sort" />
		</Sidebar>
	</svelte:fragment>

	<svelte:fragment slot="main">
		<div>
			<ul>
				{#each data.containers as container}
					<li>
						<Card --height="100%" {container} />
					</li>
				{/each}
			</ul>
		</div>
	</svelte:fragment>
</Layout>

<style>
	div {
		flex: 1 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
		min-width: calc(100vw - 3.5rem - 3rem);
	}

	li {
		width: 19.5rem;
	}
</style>
