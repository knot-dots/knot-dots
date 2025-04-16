<script lang="ts">
	import { setContext } from 'svelte';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Card from '$lib/components/Card.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureTypeFilter from '$lib/components/MeasureTypeFilter.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import PolicyFieldBNKFilter from '$lib/components/PolicyFieldBNKFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import { predicates } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		<Sidebar helpSlug="measure-templates">
			<Search slot="search" />

			<svelte:fragment slot="filters">
				<AudienceFilter />
				<OrganizationIncludedFilter />
				<CategoryFilter />
				<MeasureTypeFilter />
				<TopicFilter />
				<PolicyFieldBNKFilter />
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
