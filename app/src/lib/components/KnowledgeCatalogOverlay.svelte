<script lang="ts">
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { resource } from 'runed';
	import { z } from 'zod';
	import { page } from '$app/state';
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import {
		anyContainer,
		isKnowledgeContainer,
		payloadTypes,
		type KnowledgeContainer
	} from '$lib/models';
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
			extractCustomCategoryFiltersFromParams(
				page.url.searchParams,
				page.data.categoryContext?.keys ?? []
			)
	);

	let offset = $state(0);
	let allContainers: KnowledgeContainer[] = $state([]);
	let hasMore = $state(true);
	let isLoadingMore = $state(false);
	let previousResults: KnowledgeContainer[] | undefined;
	let loadMoreSentinel: HTMLElement | undefined = $state(undefined);

	const containersResource = resource(
		[() => $state.snapshot(activeCategories), () => offset],
		async ([cats, off], _, { signal }) => {
			const params = new URLSearchParams();
			params.append('payloadType', payloadTypes.enum.knowledge);
			params.append('sort', 'alpha');
			params.append('limit', String(PAGE_SIZE));
			params.append('offset', String(off));

			for (const [key, values] of Object.entries(cats)) {
				for (const value of values) {
					params.append(key, value);
				}
			}

			const response = await fetch(`/container?${params.toString()}`, { signal });
			if (!response.ok) {
				throw new Error(`Failed to fetch knowledge containers: ${response.status}`);
			}
			return z
				.array(anyContainer)
				.parse(await response.json())
				.filter(isKnowledgeContainer);
		},
		{ debounce: 300 }
	);

	$effect(() => {
		const results = containersResource.current;
		if (results && results !== previousResults) {
			previousResults = results;
			if (untrack(() => offset === 0)) {
				allContainers = results;
			} else {
				allContainers = [...untrack(() => allContainers), ...results];
			}
			hasMore = results.length === PAGE_SIZE;
			isLoadingMore = false;
		}
	});

	// When categories change, atomically reset offset to 0 in the same assignment
	const categoriesKey = $derived(
		Object.entries(activeCategories)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, vs]) => `${k}:${vs.join(',')}`)
			.join('|')
	);
	let previousCategoriesKey = '';
	$effect.pre(() => {
		if (categoriesKey !== previousCategoriesKey) {
			previousCategoriesKey = categoriesKey;
			offset = 0;
			hasMore = true;
			isLoadingMore = false;
			previousResults = undefined;
			allContainers = [];
		}
	});

	function loadMore() {
		// Guard against the sentinel firing before the first page has loaded
		if (isLoadingMore || !hasMore || allContainers.length === 0) return;
		isLoadingMore = true;
		offset += PAGE_SIZE;
	}

	// Infinite scroll: observe sentinel element to load more data
	$effect(() => {
		if (!loadMoreSentinel) return;

		const observer = new IntersectionObserver(
			() => {
				loadMore();
			},
			{ threshold: 0, rootMargin: '200px' }
		);

		observer.observe(loadMoreSentinel);

		return () => {
			observer.disconnect();
		};
	});
</script>

<Header workspaceOptions={[]} />

{#if allContainers.length > 0 || containersResource.loading}
	<Catalog
		containers={allContainers}
		payloadType={[payloadTypes.enum.knowledge]}
		hideCreateButton={true}
	>
		{#snippet footer()}
			{#if hasMore}
				<div bind:this={loadMoreSentinel} class="load-more-sentinel">
					{#if isLoadingMore}
						<span>{$_('loading')}</span>
					{/if}
				</div>
			{/if}
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

	.load-more-sentinel {
		display: flex;
		justify-content: center;
		min-height: 2rem;
		padding: 1rem 0;
	}
</style>
