<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Card from '$lib/components/Card.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
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
	import { payloadTypes, predicates } from '$lib/models';
	import { ability, overlay } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<Sidebar helpSlug="strategies" slot="sidebar">
		<Search slot="search" />

		<svelte:fragment slot="filters">
			{#if $page.url.searchParams.has('related-to')}
				{#if createFeatureDecisions(data.features).useNewRelationTypeFilter()}
					<RelationTypeFilter
						enabledPredicates={[
							predicates.enum['is-consistent-with'],
							predicates.enum['is-equivalent-to'],
							predicates.enum['is-inconsistent-with'],
							predicates.enum['is-superordinate-of']
						]}
					/>
				{:else}
					<RelationTypeFilter />
				{/if}
			{/if}
			<AudienceFilter />
			{#if !$page.data.currentOrganization.payload.default}
				<OrganizationIncludedFilter />
			{/if}
			<CategoryFilter />
			<TopicFilter />
			<StrategyTypeFilter />
		</svelte:fragment>

		<Sort slot="sort" />
	</Sidebar>

	<svelte:fragment slot="main">
		<div>
			{#if $ability.can('create', payloadTypes.enum.strategy)}
				<p>
					<a class="button primary" href="#create={payloadTypes.enum.strategy}">
						<PlusSmall />
						{$_('strategy')}
					</a>
				</p>
			{/if}
			<ul>
				{#each data.containers as container}
					<li>
						<Card --height="100%" {container} />
					</li>
				{/each}
			</ul>
		</div>
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
						predicates.enum['is-superordinate-of']
					]}
				/>
			{/if}
		{:else if $overlay.object}
			<RelationOverlay object={$overlay.object} />
		{/if}
	</svelte:fragment>
</Layout>

<style>
	div {
		flex: 1 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	p {
		margin-bottom: 1.5rem;
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

	.button {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
	}
</style>
