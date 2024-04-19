<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import ImplementationWorkspaces from '$lib/components/ImplementationWorkspaces.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationIncludedFilter from '$lib/components/OrganizationIncludedFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';

	import {
		isKPIContainer,
		isMeasureContainer,
		isMilestoneContainer,
		isTaskContainer,
		predicates
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: measures = data.containers.filter(isMeasureContainer);

	$: milestones = data.containers
		.filter((c) => isMilestoneContainer(c) || isKPIContainer(c))
		.filter(
			({ relation }) =>
				relation.findIndex(
					(r) =>
						r.predicate === predicates.enum['is-part-of'] &&
						measures.map(({ revision }) => revision).includes(r.object)
				) > -1
		);

	$: tasks = data.containers
		.filter(isTaskContainer)
		.filter(
			({ relation }) =>
				relation.findIndex(
					(r) =>
						(r.predicate === predicates.enum['is-part-of'] &&
							milestones.map(({ revision }) => revision).includes(r.object)) ||
						(r.predicate === predicates.enum['is-part-of-measure'] &&
							measures.map(({ revision }) => revision).includes(r.object))
				) > -1
		);

	setContext('mayShowRelationButton', true);
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		<Sidebar helpSlug="measures">
			<ImplementationWorkspaces slot="workspaces" />

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
			<BoardColumn title={$_('measures')}>
				<div class="vertical-scroll-wrapper masked-overflow">
					{#each measures as container}
						<Card {container} showRelationFilter></Card>
					{/each}
				</div>
			</BoardColumn>

			<BoardColumn title={$_('milestones')}>
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
