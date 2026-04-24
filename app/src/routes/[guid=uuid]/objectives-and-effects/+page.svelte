<script lang="ts">
	import { setContext } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import {
		type Container,
		findAncestors,
		findConnected,
		findDescendants,
		findLeafObjectives,
		isActualDataContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isEffectContainer,
		isIndicatorTemplateContainer,
		isObjectiveContainer,
		isRelatedTo,
		predicates
	} from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let allContainers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-concrete-target-of'], predicates.enum['is-sub-target-of']]
	});

	let containers = $derived.by(() => {
		let containers = new Set<Container>();

		if (page.url.searchParams.has('related-to')) {
			const selectedContainer = allContainers.find(
				({ guid }) => guid === page.url.searchParams.get('related-to')
			);

			if (selectedContainer) {
				if (isIndicatorTemplateContainer(selectedContainer)) {
					containers = findConnected(selectedContainer, allContainers, [
						predicates.enum['is-measured-by'],
						predicates.enum['is-objective-for']
					]);
				} else if (isObjectiveContainer(selectedContainer)) {
					const indicator = allContainers
						.filter(isIndicatorTemplateContainer)
						.find(isRelatedTo(selectedContainer));
					containers = new Set([
						selectedContainer,
						...(indicator ? [indicator] : []),
						...findLeafObjectives([
							selectedContainer,
							...findDescendants(selectedContainer, allContainers.filter(isObjectiveContainer), [
								predicates.enum['is-sub-target-of']
							])
						]).flatMap((c) => allContainers.filter(isEffectContainer).filter(isRelatedTo(c))),
						...findAncestors(selectedContainer, allContainers, [
							predicates.enum['is-sub-target-of']
						]),
						...findDescendants(selectedContainer, allContainers, [
							predicates.enum['is-sub-target-of']
						])
					]);
				} else if (isEffectContainer(selectedContainer)) {
					const objective = allContainers
						.filter(isObjectiveContainer)
						.find(isRelatedTo(selectedContainer));
					const indicator = allContainers
						.filter(isIndicatorTemplateContainer)
						.find(isRelatedTo(selectedContainer));
					containers = new Set([
						selectedContainer,
						...(indicator ? [indicator] : []),
						...(objective
							? [
									objective,
									...findAncestors(objective, allContainers, [predicates.enum['is-sub-target-of']])
								]
							: [])
					]);
				}
			}
		} else {
			containers = new Set(allContainers);
		}

		return containers;
	});

	let objectivesByLevel = $derived.by(() => {
		let objectivesByLevel = new SvelteMap<number, Container[]>();

		for (const container of allContainers.filter(isObjectiveContainer)) {
			const ancestors = findAncestors(container, allContainers.filter(isObjectiveContainer), [
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

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header
			{facets}
			facetLabels={data.facetLabels ?? undefined}
			categoryOptions={data.categoryOptions ?? null}
			search
		/>
	{/snippet}

	{#snippet main()}
		{#key page.url.searchParams}
			<Board>
				<BoardColumn title={$_('indicators')}>
					<div class="vertical-scroll-wrapper">
						{#each allContainers
							.filter(isIndicatorTemplateContainer)
							.filter((c) => containers.has(c)) as container (container.guid)}
							{@const dataContainers = [
								...allContainers
									.filter(isActualDataContainer)
									.filter(({ payload }) => payload.indicator === container.guid),
								...allContainers
									.filter(({ relation }) =>
										relation.some(
											({ object, predicate }) =>
												object === container.guid &&
												(predicate === predicates.enum['is-measured-by'] ||
													predicate === predicates.enum['is-objective-for'])
										)
									)
									.filter((c) => c.guid !== container.guid)
							]}
							{@const relatedContainers = [
								...dataContainers,
								...allContainers.filter(isContainerWithEffect),
								...allContainers.filter(isContainerWithObjective)
							]}
							{#if dataContainers.length > 0}
								<NewIndicatorCard {container} {relatedContainers} showRelationFilter />
							{/if}
						{/each}
					</div>
				</BoardColumn>
				{#each [...objectivesByLevel.entries()].toSorted() as [key, value] (key)}
					<BoardColumn title={`${$_('objectives')} ${key + 1}`}>
						<MaybeDragZone containers={value.filter((c) => containers.has(c))}>
							{#snippet itemSnippet(container)}
								<Card
									{container}
									relatedContainers={allContainers}
									showRelationFilter
									titleOverride
								/>
							{/snippet}
						</MaybeDragZone>
					</BoardColumn>
				{/each}
				<BoardColumn title={$_('effects')}>
					<MaybeDragZone
						containers={allContainers.filter(isEffectContainer).filter((c) => containers.has(c))}
					>
						{#snippet itemSnippet(container)}
							<Card
								{container}
								relatedContainers={[
									...allContainers.filter(isRelatedTo(container)),
									...allContainers.filter(isContainerWithEffect)
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
