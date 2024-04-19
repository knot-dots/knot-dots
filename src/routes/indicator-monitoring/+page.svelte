<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import IndicatorWorkspaces from '$lib/components/IndicatorWorkspaces.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import {
		isContainerWithEffect,
		isIndicatorContainer,
		isMilestoneContainer,
		isTaskContainer,
		predicates
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: indicators = data.containers.filter(isIndicatorContainer);

	$: measures = data.containers
		.filter(isContainerWithEffect)
		.filter(({ payload }) =>
			payload.effect
				.map(({ indicator }) => indicator)
				.some((indicator) => indicators.map(({ guid }) => guid).includes(indicator))
		);

	$: milestones = data.containers
		.filter(isMilestoneContainer)
		.filter(
			({ relation }) =>
				relation.findIndex(
					(r) =>
						r.predicate === predicates.enum['is-part-of-measure'] &&
						measures.map(({ revision }) => revision).includes(r.object)
				) > -1
		);

	$: tasks = data.containers
		.filter(isTaskContainer)
		.filter(
			({ relation }) =>
				relation.findIndex(
					(r) =>
						r.predicate === predicates.enum['is-part-of'] &&
						milestones.map(({ revision }) => revision).includes(r.object)
				) > -1
		);

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		<Sidebar helpSlug="measures">
			<IndicatorWorkspaces slot="workspaces" />

			<Search slot="search" />

			<svelte:fragment slot="filters">
				<OrganizationIncludedFilter />
				<CategoryFilter />
				<TopicFilter />
			</svelte:fragment>

			<Sort slot="sort" />
		</Sidebar>
	</svelte:fragment>

	<svelte:fragment slot="main">
		<Board>
			<BoardColumn title={$_('indicators')}>
				<div class="vertical-scroll-wrapper masked-overflow">
					{#each indicators as container}
						<Card {container} showRelationFilter></Card>
					{/each}
				</div>
			</BoardColumn>

			<BoardColumn title={$_('measures')}>
				<div class="vertical-scroll-wrapper masked-overflow">
					{#each measures as container}
						<Card {container} showRelationFilter></Card>
					{/each}
				</div>
			</BoardColumn>

			<BoardColumn title={$_('internal_objective.milestones')}>
				<div class="vertical-scroll-wrapper masked-overflow">
					{#each milestones as container}
						<Card {container} showRelationFilter></Card>
					{/each}
				</div>
			</BoardColumn>

			<BoardColumn title={$_('tasks')}>
				<div class="vertical-scroll-wrapper masked-overflow">
					{#each tasks as container}
						<Card {container} showRelationFilter></Card>
					{/each}
				</div>
			</BoardColumn>
		</Board>
	</svelte:fragment>
</Layout>
