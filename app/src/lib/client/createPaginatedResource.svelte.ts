import { resource } from 'runed';
import { untrack } from 'svelte';

interface FetchPageParams {
	limit: number;
	offset: number;
	signal: AbortSignal;
}

type ResetKey = string | number | boolean | null | undefined;

interface CreatePaginatedResourceOptions<T> {
	debounce?: number;
	fetchPage: (params: FetchPageParams) => Promise<T[]>;
	getKey?: (item: T) => string | number;
	pageSize: number;
	resetKey: () => ResetKey;
}

// Optional dedupe protects accumulated pages from overlapping results when backend ordering changes
function dedupe<T>(items: T[], getKey?: (item: T) => string | number): T[] {
	if (!getKey) return items;

	const seen = new Set<string | number>();
	const result: T[] = [];

	for (const item of items) {
		const key = getKey(item);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(item);
	}

	return result;
}

export default function createPaginatedResource<T>({
	debounce,
	fetchPage,
	getKey,
	pageSize,
	resetKey
}: CreatePaginatedResourceOptions<T>) {
	let offset = $state(0);
	let items = $state<T[]>([]);
	let hasMore = $state(true);
	let loadingMore = $state(false);
	let previousResults: T[] | undefined;

	// Keep reset keys primitive so this comparison only changes for real query changes
	const currentResetKey = $derived(resetKey());
	let previousResetKey = $state(currentResetKey);

	// Resets pagination to initial state; useful for manual resets or when resetKey changes
	function reset() {
		offset = 0;
		items = [];
		hasMore = true;
		loadingMore = false;
		previousResults = undefined;
	}

	// When resetKey changes, clear accumulated items and reset pagination
	$effect.pre(() => {
		if (currentResetKey !== previousResetKey) {
			previousResetKey = currentResetKey;
			reset();
		}
	});

	// Resource for fetching individual pages; dependencies trigger refetches and cancellation
	const pageResource = resource(
		[() => currentResetKey, () => offset],
		// resource() owns cancellation; callers only provide endpoint-specific page fetching
		async ([, offset], _, { signal }) => fetchPage({ limit: pageSize, offset, signal }),
		{ debounce }
	);

	// When a new page of results arrives, append it to the accumulated items and update hasMore
	$effect(() => {
		const results = pageResource.current;
		if (!results || results === previousResults) return;

		previousResults = results;
		// resource.current is one page; this helper exposes the accumulated list
		if (untrack(() => offset === 0)) {
			items = dedupe(results, getKey);
		} else {
			items = dedupe([...untrack(() => items), ...results], getKey);
		}

		hasMore = results.length === pageSize;
		loadingMore = false;
	});

	// Loads the next page of results by incrementing the offset; guards against concurrent loads and unnecessary calls when hasMore is false
	function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;
		offset += pageSize;
	}

	return {
		get current() {
			return pageResource.current;
		},
		get hasMore() {
			return hasMore;
		},
		get items() {
			return items;
		},
		loadMore,
		get loading() {
			return pageResource.loading;
		},
		get loadingMore() {
			return loadingMore;
		},
		reset
	};
}
