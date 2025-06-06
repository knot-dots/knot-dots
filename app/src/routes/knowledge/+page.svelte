<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { type Container, findAncestors, predicates } from '$lib/models';
	import type { PageProps } from './$types';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import IndicatorCategoryFilter from '$lib/components/IndicatorCategoryFilter.svelte';
	import IndicatorTypeFilter from '$lib/components/IndicatorTypeFilter.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import PolicyFieldBNKFilter from '$lib/components/PolicyFieldBNKFilter.svelte';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Search from '$lib/components/Search.svelte';

	let { data }: PageProps = $props();

	let knowledgeByLevel = $derived.by(() => {
		let knowledgeByLevel = new Map<number, Container[]>();

		for (const container of data.containers) {
			const ancestors = findAncestors(container, data.containers, predicates.enum['is-part-of']);
			const level = ancestors.length;

			if (knowledgeByLevel.has(level)) {
				knowledgeByLevel.set(level, [...(knowledgeByLevel.get(level) as Container[]), container]);
			} else {
				knowledgeByLevel.set(level, [container]);
			}
		}

		return knowledgeByLevel;
	});
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		<Sidebar helpSlug="knowledge">
			<Search slot="search" />

			<svelte:fragment slot="filters">
				<AudienceFilter />
				<CategoryFilter />
				<TopicFilter />
				<PolicyFieldBNKFilter />
			</svelte:fragment>
		</Sidebar>
	</svelte:fragment>

	<svelte:fragment slot="main">
		{#key page.url.searchParams}
			<Board>
				{#each [...knowledgeByLevel.entries()].toSorted() as [key, value] (key)}
					<BoardColumn title={$_('knowledge.level', { values: { level: key + 1 } })}>
						<MaybeDragZone containers={value} let:container>
							<Card
								{container}
								relatedContainers={data.containers}
								showRelationFilter
								titleOverride
							/>
						</MaybeDragZone>
					</BoardColumn>
				{/each}
			</Board>
		{/key}
	</svelte:fragment>
</Layout>
