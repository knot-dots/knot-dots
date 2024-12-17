<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import Card from '$lib/components/Card.svelte';
	import IndicatorCategoryFilter from '$lib/components/IndicatorCategoryFilter.svelte';
	import IndicatorTypeFilter from '$lib/components/IndicatorTypeFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TopicFilter from '$lib/components/TopicFilter.svelte';
	import {
		type Container,
		isContainerWithEffect,
		isEffectContainer,
		isIndicatorContainer,
		isObjectiveContainer,
		isRelatedTo
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	function relatedToFilter(container: Container) {
		if ($page.url.searchParams.has('related-to')) {
			const selectedContainer = data.containers.find(
				({ guid }) => guid === $page.url.searchParams.get('related-to')
			);
			return (
				selectedContainer?.revision === container.revision ||
				container.relation.findIndex(
					({ object, subject }) =>
						selectedContainer?.revision === object || selectedContainer?.revision === subject
				) > -1
			);
		}
		return true;
	}
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		<Sidebar helpSlug="indicators">
			<svelte:fragment slot="filters">
				<IndicatorTypeFilter />
				<AudienceFilter />
				<IndicatorCategoryFilter />
				<CategoryFilter />
				<TopicFilter />
			</svelte:fragment>
		</Sidebar>
	</svelte:fragment>

	<svelte:fragment slot="main">
		{#key $page.url.searchParams}
			<Board>
				<BoardColumn title={$_('indicators')}>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#each data.containers
							.filter(isIndicatorContainer)
							.filter(relatedToFilter) as container}
							<Card {container} relatedContainers={data.containers} showRelationFilter />
						{/each}
					</div>
				</BoardColumn>
				<BoardColumn title={$_('objectives')}>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#each data.containers
							.filter(isObjectiveContainer)
							.filter(relatedToFilter) as container}
							<Card
								{container}
								relatedContainers={[container, ...data.containers.filter(isRelatedTo(container))]}
								showRelationFilter
							/>
						{/each}
					</div>
				</BoardColumn>
				<BoardColumn title={$_('effects')}>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#each data.containers.filter(isEffectContainer).filter(relatedToFilter) as container}
							<Card
								{container}
								relatedContainers={[
									container,
									...data.containers.filter(isRelatedTo(container)),
									...data.containers.filter(isContainerWithEffect)
								]}
								showRelationFilter
							/>
						{/each}
					</div>
				</BoardColumn>
			</Board>
		{/key}
	</svelte:fragment>
</Layout>
