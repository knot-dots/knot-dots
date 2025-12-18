<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		findAncestors,
		findConnected,
		findDescendants,
		findLeafObjectives,
		fromCounts,
		indicatorCategories,
		indicatorTypes,
		isContainerWithEffect,
		isEffectContainer,
		isIndicatorContainer,
		isObjectiveContainer,
		isRelatedTo,
		policyFieldBNK,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-concrete-target-of'], predicates.enum['is-sub-target-of']]
	});

	let containers = $derived.by(() => {
		let containers = new Set<Container>();

		if (page.url.searchParams.has('related-to')) {
			const selectedContainer = data.containers.find(
				({ guid }) => guid === page.url.searchParams.get('related-to')
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
					containers = new Set([
						selectedContainer,
						...(indicator ? [indicator] : []),
						...findLeafObjectives([
							selectedContainer,
							...findDescendants(selectedContainer, data.containers.filter(isObjectiveContainer), [
								predicates.enum['is-sub-target-of']
							])
						]).flatMap((c) => data.containers.filter(isEffectContainer).filter(isRelatedTo(c))),
						...findAncestors(selectedContainer, data.containers, [
							predicates.enum['is-sub-target-of']
						]),
						...findDescendants(selectedContainer, data.containers, [
							predicates.enum['is-sub-target-of']
						])
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
									...findAncestors(objective, data.containers, [
										predicates.enum['is-sub-target-of']
									])
								]
							: [])
					]);
				}
			}
		} else {
			containers = new Set(data.containers);
		}

		return containers;
	});

	let objectivesByLevel = $derived.by(() => {
		let objectivesByLevel = new Map<number, Container[]>();

		for (const container of data.containers.filter(isObjectiveContainer)) {
			const ancestors = findAncestors(container, data.containers.filter(isObjectiveContainer), [
				predicates.enum['is-sub-target-of']
			]);
			const level = ancestors.length;

			if (objectivesByLevel.has(level)) {
				objectivesByLevel.set(level, [...(objectivesByLevel.get(level) as Container[]), container]);
			} else {
				objectivesByLevel.set(level, [container]);
			}
		}

		return objectivesByLevel;
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			['indicatorType', fromCounts(indicatorTypes.options, data.facets.indicatorType)],
			['indicatorCategory', fromCounts(indicatorCategories.options, data.facets.indicatorCategory)],
			['audience', fromCounts(audience.options, data.facets.audience)],
			['category', fromCounts(sustainableDevelopmentGoals.options, data.facets.category)],
			['topic', fromCounts(topics.options, data.facets.topic)],
			['policyFieldBNK', fromCounts(policyFieldBNK.options, data.facets.policyFieldBNK)]
		]);

		if (Object.keys(data.facets).length === 0) {
			return computeFacetCount(facets, data.containers);
		}

		return facets;
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		{#key page.url.searchParams}
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
						<MaybeDragZone containers={value.filter((c) => containers.has(c))}>
							{#snippet itemSnippet(container)}
								<Card
									{container}
									relatedContainers={data.containers}
									showRelationFilter
									titleOverride
								/>
							{/snippet}
						</MaybeDragZone>
					</BoardColumn>
				{/each}
				<BoardColumn title={$_('effects')}>
					<MaybeDragZone
						containers={data.containers.filter(isEffectContainer).filter((c) => containers.has(c))}
					>
						{#snippet itemSnippet(container)}
							<Card
								{container}
								relatedContainers={[
									...data.containers.filter(isRelatedTo(container)),
									...data.containers.filter(isContainerWithEffect)
								]}
								showRelationFilter
								titleOverride
							/>
						{/snippet}
					</MaybeDragZone>
				</BoardColumn>
			</Board>
		{/key}

		<Help slug="objectives-and-effects" />
	{/snippet}
</Layout>
