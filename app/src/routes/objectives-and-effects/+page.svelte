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
							...findDescendants(
								selectedContainer,
								data.containers.filter(isObjectiveContainer),
								predicates.enum['is-sub-target-of']
							)
						]).flatMap((c) => data.containers.filter(isEffectContainer).filter(isRelatedTo(c))),
						...findAncestors(
							selectedContainer,
							data.containers,
							predicates.enum['is-sub-target-of']
						),
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

		return containers;
	});

	let objectivesByLevel = $derived.by(() => {
		let objectivesByLevel = new Map<number, Container[]>();

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

		return objectivesByLevel;
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	<Header {facets} search slot="header" />

	<svelte:fragment slot="main">
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
						<MaybeDragZone containers={value.filter((c) => containers.has(c))} let:container>
							<Card
								{container}
								relatedContainers={data.containers}
								showRelationFilter
								titleOverride
							/>
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
							titleOverride
						/>
					</MaybeDragZone>
				</BoardColumn>
			</Board>
		{/key}

		<Help slug="objectives-and-effects" />
	</svelte:fragment>
</Layout>
