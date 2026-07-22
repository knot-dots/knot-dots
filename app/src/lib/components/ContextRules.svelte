<script lang="ts">
	import { resource, type ResourceReturn } from 'runed';
	import { getContext, type Snippet } from 'svelte';
	import z from 'zod';
	import { page } from '$app/state';
	import {
		type Container,
		createContainerSchema,
		isContainerWithCategory,
		payloadTypes,
		type RulePayload,
		rulePayload
	} from '$lib/models';
	import { overlay as overlayStore } from '$lib/stores';
	import { extractCustomCategoryFiltersFromParams } from '$lib/utils/customCategoryFilters';

	interface Props {
		children: Snippet<[ResourceReturn<Array<Container<RulePayload>>>]>;
	}

	let { children }: Props = $props();

	const overlay = getContext('overlay');

	let container = $derived(overlay ? $overlayStore?.container : page.data.container);

	let categories = $derived(
		container && isContainerWithCategory(container)
			? container.payload.category
			: extractCustomCategoryFiltersFromParams(
					page.url.searchParams,
					page.data.categoryContext?.keys ?? []
				)
	);

	let query = $derived.by(() => {
		const params = new URLSearchParams({
			categoryMatch: 'any',
			payloadType: payloadTypes.enum.rule,
			sort: 'alpha'
		});

		for (const [key, values] of Object.entries(categories)) {
			for (const value of values) params.append(key, value);
		}

		return params.toString();
	});

	const containers = resource(
		[() => query],
		async (query, _, { signal }) => {
			const response = await fetch(`/container?${query}`, { signal });
			if (!response.ok) {
				throw new Error(`Failed to fetch rule containers: ${response.status}`);
			}

			const containers = z.array(createContainerSchema(rulePayload)).parse(await response.json());
			const totalFilterTerms = Object.values(categories).flat().length;
			return totalFilterTerms === 0
				? containers
				: containers
						.map((c) => ({ container: c, score: countMatchingTerms(c, categories) }))
						.sort((a, b) => b.score - a.score)
						.map(({ container }) => container);
		},
		{ debounce: 300 }
	);

	function countMatchingTerms(
		container: Container<RulePayload>,
		cats: Record<string, string[]>
	): number {
		const containerCats = container.payload.category;
		return Object.entries(cats).reduce((sum, [key, values]) => {
			const containerValues = containerCats[key] ?? [];
			return sum + values.filter((v) => containerValues.includes(v)).length;
		}, 0);
	}
</script>

{@render children(containers)}
