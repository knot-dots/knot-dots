<script lang="ts">
	import { resource } from 'runed';
	import { _ } from 'svelte-i18n';
	import InfoCircle from '~icons/flowbite/info-circle-solid';
	import { page } from '$app/state';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import fetchSuggestedContainers from '$lib/client/fetchSuggestedContainers';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import RelevanceBadge from '$lib/components/RelevanceBadge.svelte';
	import SearchToolbar from '$lib/components/SearchToolbar.svelte';
	import SingleChoiceSelectableCardSet from '$lib/components/SingleChoiceSelectableCardSet.svelte';
	import {
		type BinaryIndicatorPayload,
		type Container,
		type GoalPayload,
		type IndicatorPayload,
		isEffectContainer,
		type MeasurePayload,
		payloadTypes
	} from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';

	interface Props {
		onSelect: (container: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>) => void;
		target: Container<GoalPayload | MeasurePayload>;
		value?: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
	}

	let { onSelect, target, value }: Props = $props();

	const categoryContext = $derived(
		filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.indicator])
	);

	let filter = $state<Record<string, string[]>>({
		...Object.fromEntries(categoryContext.keys.map((k) => [k, []])),
		indicatorCategory: [],
		indicatorType: []
	});

	let terms = $state('');

	function fetchPage(
		query: Parameters<typeof fetchSuggestedContainers>[1],
		offset: number,
		init?: RequestInit
	) {
		return fetchSuggestedContainers(target.guid, query, { limit: DEFAULT_PAGE_SIZE, offset }, init);
	}

	// The first page keeps its query, which the pages loaded on scrolling
	// continue even while the filters are being changed.
	const searchResource = resource(
		[() => $state.snapshot(filter), () => terms],
		async (_, __, { signal }) => {
			const query = {
				...$state.snapshot(filter),
				organization: [page.data.currentOrganization.guid],
				terms
			};
			return { ...(await fetchPage(query, 0, { signal })), query };
		},
		{
			debounce: 300
		}
	);

	type SuggestionPage = Awaited<ReturnType<typeof fetchSuggestedContainers>>;

	// Pages loaded on scrolling, which belong to the first page they continue
	// and are dropped along with it once the filters change.
	let morePages = $state.raw<{ first: SuggestionPage; pages: SuggestionPage[] }>();

	let loadingMore = $state(false);

	let pages = $derived(
		searchResource.current
			? [
					searchResource.current,
					...(morePages?.first === searchResource.current ? morePages.pages : [])
				]
			: []
	);

	// The ranking is computed anew for every page, so a page repeats suggestions
	// of the previous one if the ranking has changed in between.
	let suggestions = $derived([
		...new Map(
			pages.flatMap((p) => p.suggestions).map((s) => [s.indicator.guid, s] as const)
		).values()
	]);

	let options = $derived(suggestions.map(({ indicator }) => indicator));

	let relevanceByGuid = $derived(
		new Map(suggestions.map(({ indicator, relevance }) => [indicator.guid, relevance]))
	);

	let facets = $derived(searchResource.current?.facets ?? new Map<string, Map<string, number>>());

	let nextOffset = $derived(pages.at(-1)?.page.nextOffset ?? null);

	async function loadMore() {
		const first = searchResource.current;
		if (!first || loadingMore || nextOffset === null) {
			return;
		}

		loadingMore = true;
		try {
			const next = await fetchPage(first.query, nextOffset);
			if (searchResource.current === first) {
				morePages = {
					first,
					pages: [...(morePages?.first === first ? morePages.pages : []), next]
				};
			}
		} finally {
			loadingMore = false;
		}
	}
</script>

<SearchToolbar bind:filter bind:terms {categoryContext} {facets}>
	{#snippet extraPrimaryContent()}
		<span class="prompt">
			<InfoCircle />
			{#if isEffectContainer(target)}
				{$_('create_effect_dialog.prompt_effect')}
			{:else}
				{$_('create_effect_dialog.prompt_objective')}
			{/if}
		</span>
	{/snippet}
</SearchToolbar>

<div class="search-result">
	{#if searchResource.current}
		<SingleChoiceSelectableCardSet {onSelect} {options} {value}>
			{#snippet optionFooter(option)}
				<RelevanceBadge score={relevanceByGuid.get(option.guid) ?? 0} />
			{/snippet}
		</SingleChoiceSelectableCardSet>

		<LazyLoadSentinel hasMore={nextOffset !== null} loading={loadingMore} onLoadMore={loadMore} />
	{/if}
</div>

<style>
	.prompt {
		align-items: center;
		background-color: var(--color-yellow-050);
		border: solid 1px var(--color-yellow-200);
		border-radius: 8px;
		color: var(--color-yellow-900);
		display: flex;
		font-size: 0.875rem;
		gap: 0.375rem;
		line-height: 1.25;
		padding: 0.375rem 1rem 0.375rem 0.5rem;
	}

	.prompt > :global(svg) {
		color: var(--color-yellow-500);
		height: 1.5rem;
		width: 1.5rem;
	}

	.search-result {
		margin-top: 1rem;
		overflow-y: auto;
	}
</style>
