import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type ContainerGroup, containerGroupQuery } from '$lib/containerGroups';
import type { AnyPayload, Container } from '$lib/models';

interface FetchContainerGroupPageOptions {
	contextGuid?: string;
	fetch: typeof fetch;
	group: ContainerGroup;
	limit: number;
	offset: number;
	query: URLSearchParams;
	signal?: AbortSignal;
}

// Fetches a further page of a group of the containers matching the query,
// such as a column of a board.
export default async function fetchContainerGroupPage<T extends Container<AnyPayload>>({
	group,
	query,
	...options
}: FetchContainerGroupPageOptions) {
	const groupQuery = containerGroupQuery(query, group);
	if (!groupQuery) {
		return { hasMore: false, items: [] as T[], nextOffset: null };
	}

	const result = await fetchContainerPage<T>({ ...options, query: groupQuery });
	return {
		hasMore: result.page.hasMore,
		items: result.containers,
		nextOffset: result.page.nextOffset
	};
}
