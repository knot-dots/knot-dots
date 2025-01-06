<script lang="ts">
	import { setContext } from 'svelte';
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
		findAncestors,
		findConnected,
		findDescendants,
		isContainerWithEffect,
		isEffectContainer,
		isIndicatorContainer,
		isObjectiveContainer,
		isRelatedTo,
		predicates
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	let containers: Set<Container> = new Set();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-concrete-target-of'], predicates.enum['is-sub-target-of']]
	});

	$: if ($page.url.searchParams.has('related-to')) {
		const selectedContainer = data.containers.find(
			({ guid }) => guid === $page.url.searchParams.get('related-to')
		);

		if (selectedContainer) {
			if (isIndicatorContainer(selectedContainer)) {
				containers = findConnected(selectedContainer, data.containers, [
					predicates.enum['is-measured-by'],
					predicates.enum['is-objective-for']
				]);
			} else if (isObjectiveContainer(selectedContainer)) {
				const indicator = data.containers
					.filter(isIndicatorContainer)
					.find(isRelatedTo(selectedContainer));
				const effect = indicator
					? data.containers.filter(isEffectContainer).find(isRelatedTo(indicator))
					: undefined;
				containers = new Set([
					selectedContainer,
					...(indicator ? [indicator] : []),
					...(effect ? [effect] : []),
					...findAncestors(selectedContainer, data.containers, predicates.enum['is-sub-target-of']),
					...findDescendants(
						selectedContainer,
						data.containers,
						predicates.enum['is-sub-target-of']
					)
				]);
			} else if (isEffectContainer(selectedContainer)) {
				const objective = data.containers
					.filter(isObjectiveContainer)
					.find(isRelatedTo(selectedContainer));
				const indicator = data.containers
					.filter(isIndicatorContainer)
					.find(isRelatedTo(selectedContainer));
				containers = new Set([
					selectedContainer,
					...(indicator ? [indicator] : []),
					...(objective
						? [
								objective,
								...findAncestors(objective, data.containers, predicates.enum['is-sub-target-of'])
							]
						: [])
				]);
			}
		}
	} else {
		containers = new Set(data.containers);
	}

	let objectivesByLevel: Map<number, Container[]>;

	$: {
		objectivesByLevel = new Map<number, Container[]>();

		for (const container of data.containers.filter(isObjectiveContainer)) {
			const ancestors = findAncestors(
				container,
				data.containers.filter(isObjectiveContainer),
				predicates.enum['is-sub-target-of']
			);
			const level = ancestors.length;

			if (objectivesByLevel.has(level)) {
				objectivesByLevel.set(level, [...(objectivesByLevel.get(level) as Container[]), container]);
			} else {
				objectivesByLevel.set(level, [container]);
			}
		}
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
							.filter((c) => containers.has(c)) as container}
							<Card {container} relatedContainers={data.containers} showRelationFilter />
						{/each}
					</div>
				</BoardColumn>
				{#each [...objectivesByLevel.entries()].toSorted() as [key, value] (key)}
					<BoardColumn title={`${$_('objectives')} ${key + 1}`}>
						<MaybeDragZone containers={value.filter((c) => containers.has(c))} let:container>
							<Card {container} relatedContainers={data.containers} showRelationFilter />
						</MaybeDragZone>
					</BoardColumn>
				{/each}
				<BoardColumn title={$_('effects')}>
					<MaybeDragZone
						containers={data.containers.filter(isEffectContainer).filter((c) => containers.has(c))}
						let:container
					>
						<Card
							{container}
							relatedContainers={[
								...data.containers.filter(isRelatedTo(container)),
								...data.containers.filter(isContainerWithEffect)
							]}
							showRelationFilter
						/>
					</MaybeDragZone>
				</BoardColumn>
			</Board>
		{/key}
	</svelte:fragment>
</Layout>
