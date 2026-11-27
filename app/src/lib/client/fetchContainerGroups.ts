import { z } from 'zod';
import { containerPageSchema, facetsSchema } from '$lib/client/fetchContainerPage';
import { type ContainerGroup, formatContainerGroup } from '$lib/containerGroups';
import type { AnyPayload, Container } from '$lib/models';

interface FetchContainerGroupsOptions {
	contextGuid?: string;
	fetch: typeof fetch;
	groups: ContainerGroup[];
	limit: number;
	query: URLSearchParams;
	signal?: AbortSignal;
}

const responseSchema = z.object({
	facets: facetsSchema,
	groups: z.array(containerPageSchema)
});

// Fetches the first page of each group of the containers matching the query;
// the pages are returned in the order of the groups.
export default async function fetchContainerGroups<T extends Container<AnyPayload>>({
	contextGuid,
	fetch,
	groups,
	limit,
	query,
	signal
}: FetchContainerGroupsOptions) {
	const params = new URLSearchParams(query);

	if (contextGuid) {
		params.set('contextGuid', contextGuid);
	}

	params.delete('group');
	for (const group of groups) {
		params.append('group', formatContainerGroup(group));
	}

	params.set('limit', String(limit));
	params.set('offset', '0');

	const response = await fetch(`/container/v2/groups?${params.toString()}`, { signal });
	if (!response.ok) {
		throw new Error(
			`Failed to fetch container groups: ${response.status} ${await response.clone().text()}`
		);
	}

	const parsed = responseSchema.parse(await response.json());
	return {
		facets: parsed.facets,
		groups: parsed.groups.map((group) => ({ ...group, containers: group.containers as T[] }))
	};
}
