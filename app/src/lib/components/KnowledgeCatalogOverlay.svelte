<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { resource } from 'runed';
	import { z } from 'zod';
	import { page } from '$app/state';
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import { knowledgeContainer, payloadTypes, type KnowledgeContainer } from '$lib/models';
	import { extractCustomCategoryFiltersFromParams } from '$lib/utils/customCategoryFilters';

	const PAGE_SIZE = 20;

	interface Props {
		// Defined when the catalog was opened from a container view and should
		// use that container's categories. Undefined means derive reactively from
		// the current page's URL search params.
		categories: Record<string, string[]> | undefined;
	}

	let { categories = undefined }: Props = $props();

	// When opened from a container, use its categories (stable).
	// Otherwise, derive from URL search params so filter changes on the page
	// are reflected immediately without needing a hash change.
	const activeCategories = $derived(
		categories ??
			extractCustomCategoryFiltersFromParams(page.url.searchParams, page.data.categoryContext.keys)
	);

	let visibleCount = $state(PAGE_SIZE);

	// Stable string key — avoids re-fetching when only the URL hash changes
	// (which would produce a new object reference from activeCategories but the
	// same logical category selection).
	const categoriesKey = $derived(
		Object.entries(activeCategories)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, vs]) => `${k}:${[...vs].sort().join(',')}`)
			.join('|')
	);
	let previousCategoriesKey = $state<string | undefined>();

	const containersResource = resource(
		() => categoriesKey,
		async (_, __, { signal }) => {
			const params = new URLSearchParams();
			params.append('payloadType', payloadTypes.enum.knowledge);
			params.append('sort', 'alpha');
			params.append('categoryMatch', 'any');

			for (const [key, values] of Object.entries(activeCategories)) {
				for (const value of values) {
					params.append(key, value);
				}
			}

			const response = await fetch(`/container?${params.toString()}`, { signal });
			if (!response.ok) {
				throw new Error(`Failed to fetch knowledge containers: ${response.status}`);
			}
			return z.array(knowledgeContainer).parse(await response.json());
		},
		{ debounce: 300 }
	);

	// Reset visible count when categories (and thus the result set) change
	$effect.pre(() => {
		if (categoriesKey !== previousCategoriesKey) {
			previousCategoriesKey = categoriesKey;
			visibleCount = PAGE_SIZE;
		}
	});

	function countMatchingTerms(
		container: KnowledgeContainer,
		cats: Record<string, string[]>
	): number {
		const containerCats = container.payload.category;
		return Object.entries(cats).reduce((sum, [key, values]) => {
			const containerValues = containerCats[key] ?? [];
			return sum + values.filter((v) => containerValues.includes(v)).length;
		}, 0);
	}

	const totalFilterTerms = $derived(Object.values(activeCategories).flat().length);
	const allContainers = $derived(containersResource.current ?? []);

	const sortedContainers = $derived(
		totalFilterTerms === 0
			? allContainers
			: allContainers
					.map((c) => ({ container: c, score: countMatchingTerms(c, activeCategories) }))
					.sort((a, b) => b.score - a.score)
					.map(({ container }) => container)
	);

	const visibleContainers = $derived(sortedContainers.slice(0, visibleCount));
	const hasMore = $derived(visibleCount < sortedContainers.length);

	function showMore() {
		if (!hasMore) return;
		visibleCount += PAGE_SIZE;
	}
</script>

<Header workspaceOptions={[]} />

{#if allContainers.length > 0 || containersResource.loading}
	<Catalog
		containers={visibleContainers}
		payloadType={[payloadTypes.enum.knowledge]}
		hideCreateButton={true}
	>
		{#snippet footer()}
			<LazyLoadSentinel {hasMore} onLoadMore={showMore} />
		{/snippet}
	</Catalog>
{:else if !containersResource.loading}
	<div class="empty-state">
		<h2>{$_('knowledge_catalog.empty')}</h2>
	</div>
{/if}

<style>
	.empty-state {
		padding: 3.5rem 5rem;
	}

	.empty-state h2 {
		color: var(--color-gray-700);
		margin: 0;
	}
</style>
