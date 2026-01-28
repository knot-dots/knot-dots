<script lang="ts">
	// Snippet import removed; not used
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
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
		titleForProgramCollection,
		computeFacetCount,
		type Container,
		findAncestors,
		isCategoryContainer,
		payloadTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics,
		predicates,
		programTypes
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const featureDecisions = createFeatureDecisions(page.data.features ?? []);

	// eslint-disable-next-line svelte/prefer-writable-derived
	let categoryFacets = $state(new Map<string, Map<string, number>>());
	// eslint-disable-next-line svelte/prefer-writable-derived
	let facetLabels = $state(new Map<string, string>());
	// eslint-disable-next-line svelte/prefer-writable-derived
	let categoryOptions = $state<CategoryOptions | null>(null);

	let knowledgeByLevel = $derived.by(() => {
		let knowledgeByLevel = new Map<number, Container[]>();

		for (const container of data.containers) {
			const ancestors = findAncestors(container, data.containers, [predicates.enum['is-part-of']]);
			const level = ancestors.length;

			if (knowledgeByLevel.has(level)) {
				knowledgeByLevel.set(level, [...(knowledgeByLevel.get(level) as Container[]), container]);
			} else {
				knowledgeByLevel.set(level, [container]);
			}
		}

		return knowledgeByLevel;
	});

	const toFacetKey = (key: string) =>
		key === 'sdg' ? 'category' : key === 'policy_field_bnk' ? 'policyFieldBNK' : key;

	$effect(() => {
		const organizationScope = Array.from(
			new Set(
				[page.data.currentOrganization?.guid, page.data.defaultOrganizationGuid].filter(
					(guid): guid is string => Boolean(guid)
				)
			)
		);

		if (!featureDecisions.useCustomCategories()) {
			categoryFacets = new Map();
			facetLabels = new Map();
			categoryOptions = null;
			return;
		}

		let cancelled = false;
		(async () => {
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

			const mappedFacets = new Map<string, Map<string, number>>();
			for (const [key, values] of nextFacets) {
				mappedFacets.set(toFacetKey(key), values);
			}

			const mappedLabels = new Map<string, string>();
			for (const [key, label] of nextLabels) {
				mappedLabels.set(toFacetKey(key), label);
			}

			if (cancelled) return;
			categoryFacets = mappedFacets;
			facetLabels = mappedLabels;
			const mappedOptions: CategoryOptions = {};
			for (const [key, value] of Object.entries(options)) {
				if (key === '__categoryLabels__') continue;
				if (!Array.isArray(value)) continue;
				mappedOptions[toFacetKey(key)] = value;
			}
			const labelEntries = Object.entries(options.__categoryLabels__ ?? {}).map(([k, v]) => [
				toFacetKey(k),
				v
			]);
			if (labelEntries.length) {
				mappedOptions.__categoryLabels__ = Object.fromEntries(labelEntries);
			}
			categoryOptions = mappedOptions;
		})();

		return () => {
			cancelled = true;
		};
	});

	let facets = $derived.by(() => {
		const entries: Array<[string, Map<string, number>]> = [];

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

		entries.push([
			'programType',
			new Map<string, number>(programTypes.options.map((v: string) => [v, 0]))
		]);

		const facets = new Map<string, Map<string, number>>(entries);
		return computeFacetCount(facets, [...data.containers, ...data.programs]);
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
		<Board>
			<BoardColumn title={titleForProgramCollection(data.programs)}>
				<div class="vertical-scroll-wrapper">
					{#each data.programs as container (container.guid)}
						<Card {container} showRelationFilter />
					{/each}
				</div>
			</BoardColumn>

			{#each [...knowledgeByLevel.entries()].toSorted() as [key, value] (key)}
				<BoardColumn
					addItemUrl="#create=knowledge"
					title={$_('knowledge.level', { values: { level: key + 1 } })}
				>
					<MaybeDragZone containers={value}>
						{#snippet itemSnippet(container)}
							<Card {container} showRelationFilter />
						{/snippet}
					</MaybeDragZone>
				</BoardColumn>
			{/each}
		</Board>

		<Help slug="knowledge-level" />
	{/snippet}
</Layout>
