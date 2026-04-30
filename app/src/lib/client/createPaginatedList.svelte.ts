type ResetKey = string | number | boolean | null | undefined;

interface FetchPageParams {
	offset: number;
	signal: AbortSignal;
}

interface FetchPageResult<T> {
	hasMore: boolean;
	items: T[];
	nextOffset?: number | null;
}

interface CreatePaginatedListOptions<T> {
	fetchPage: (params: FetchPageParams) => Promise<FetchPageResult<T>>;
	getKey?: (item: T) => string | number;
	initialHasMore: () => boolean;
	initialItems: () => T[];
	pageSize: number;
	resetKey: () => ResetKey;
}

function dedupe<T>(items: T[], getKey?: (item: T) => string | number) {
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

export default function createPaginatedList<T>({
	fetchPage,
	getKey,
	initialHasMore,
	initialItems,
	pageSize,
	resetKey
}: CreatePaginatedListOptions<T>) {
	let abortController: AbortController | undefined;
	let hasMore = $state(initialHasMore());
	let items = $state<T[]>(initialItems());
	let loadingMore = $state(false);
	let nextOffset = $state(pageSize);
	let previousResetKey = $state<ResetKey>();

	$effect.pre(() => {
		const currentResetKey = resetKey();
		if (currentResetKey === previousResetKey) return;

		abortController?.abort();
		previousResetKey = currentResetKey;
		hasMore = initialHasMore();
		items = initialItems();
		loadingMore = false;
		nextOffset = pageSize;
	});

	async function loadMore() {
		if (loadingMore || !hasMore) return;

		abortController?.abort();
		const controller = new AbortController();
		abortController = controller;
		loadingMore = true;

		try {
			const result = await fetchPage({
				offset: nextOffset,
				signal: controller.signal
			});
			if (controller.signal.aborted || abortController !== controller) return;

			items = dedupe([...items, ...result.items], getKey);
			hasMore = result.hasMore;
			nextOffset = result.nextOffset ?? nextOffset + pageSize;
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) {
				throw error;
			}
		} finally {
			if (!controller.signal.aborted && abortController === controller) {
				loadingMore = false;
			}
		}
	}

	return {
		get hasMore() {
			return hasMore;
		},
		get items() {
			return items;
		},
		loadMore,
		get loadingMore() {
			return loadingMore;
		}
	};
}
