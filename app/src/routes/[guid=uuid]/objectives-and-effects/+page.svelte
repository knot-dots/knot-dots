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
		loadCategoryOptions,
		buildCategoryFacets,
		buildCategoryLabels,
		type CategoryOptions
	} from '$lib/client/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import { createFeatureDecisions } from '$lib/features';
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
		isCategoryContainer,
		isContainerWithEffect,
		isEffectContainer,
		isIndicatorContainer,
		isObjectiveContainer,
		isRelatedTo,
		policyFieldBNK,
		payloadTypes,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const featureDecisions = createFeatureDecisions(page.data.features ?? []);

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

	let categoryFacets = $state(new Map<string, Map<string, number>>());
	let facetLabels = $state(new Map<string, string>());
	let categoryOptions = $state<CategoryOptions | null>(null);

	$effect(() => {
		const organizationScope = Array.from(
			new Set(
				[page.data.currentOrganization?.guid, page.data.defaultOrganizationGuid].filter(
					(guid): guid is string => Boolean(guid)
				)
			)
		);

		let cancelled = false;
		(async () => {
			if (!featureDecisions.useCustomCategories()) {
				categoryFacets = new Map();
				facetLabels = new Map();
				categoryOptions = null;
				return;
			}

			const [scopedCategories, fallbackCategories] = await Promise.all([
				fetchContainers(
					{ organization: organizationScope, payloadType: [payloadTypes.enum.category] },
					'alpha'
				),
				fetchContainers({ payloadType: [payloadTypes.enum.category] }, 'alpha')
			]);

			if (cancelled) return;

			const categoryKeys = Array.from(
				new Set(
					[...scopedCategories, ...fallbackCategories]
						.filter(isCategoryContainer)
						.map(({ payload }) => payload.key)
						.filter((key): key is string => Boolean(key))
				)
			);

			let options = await loadCategoryOptions(categoryKeys, organizationScope);
			let nextFacets = buildCategoryFacets(options);
			let nextLabels = buildCategoryLabels(options);

			if (nextFacets.size === 0) {
				options = await loadCategoryOptions(categoryKeys, []);
				nextFacets = buildCategoryFacets(options);
				nextLabels = buildCategoryLabels(options);
			}

			if (cancelled) return;
			categoryFacets = nextFacets;
			facetLabels = nextLabels;
			categoryOptions = options;
		})();

		return () => {
			cancelled = true;
		};
	});

	let facets = $derived.by(() => {
		const entries: Array<[string, Map<string, number>]> = [
			['indicatorType', new Map<string, number>(indicatorTypes.options.map((v: string) => [v, 0]))],
			[
				'indicatorCategory',
				new Map<string, number>(indicatorCategories.options.map((v: string) => [v, 0]))
			]
		];

		if (featureDecisions.useCustomCategories()) {
			for (const [key, values] of categoryFacets.entries()) {
				entries.push([key, new Map<string, number>(values.entries())]);
			}
		} else {
			entries.push([
				'category',
				new Map<string, number>(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))
			]);
			entries.push(['topic', new Map<string, number>(topics.options.map((v) => [v as string, 0]))]);
			entries.push([
				'policyFieldBNK',
				new Map<string, number>(policyFieldBNK.options.map((v) => [v as string, 0]))
			]);
			entries.push([
				'audience',
				new Map<string, number>(audience.options.map((v) => [v as string, 0]))
			]);
		}

		const facets = new Map<string, Map<string, number>>(entries);
		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	{#snippet header()}
		<Header
			{facets}
			facetLabels={featureDecisions.useCustomCategories() ? facetLabels : undefined}
			categoryOptions={featureDecisions.useCustomCategories() ? categoryOptions : null}
			search
		/>
	{/snippet}

	{#snippet main()}
		{#key page.url.searchParams}
			<Board>
				<BoardColumn title={$_('indicators')}>
					<div class="vertical-scroll-wrapper">
						{#each data.containers
							.filter(isIndicatorContainer)
							.filter((c) => containers.has(c)) as container (container.guid)}
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
