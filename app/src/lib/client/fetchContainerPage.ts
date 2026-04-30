import { z } from 'zod';
import { anyContainer, type AnyContainer } from '$lib/models';

type FilterValue = string | string[] | undefined;

interface FetchContainerPageOptions {
	contextGuid?: string;
	filters: Record<string, FilterValue>;
	limit: number;
	offset: number;
	signal: AbortSignal;
	sort?: string;
}

const responseSchema = z.object({
	containers: z.array(anyContainer),
	page: z.object({
		hasMore: z.boolean(),
		limit: z.number(),
		nextOffset: z.number().nullable(),
		offset: z.number()
	})
});

export default async function fetchContainerPage<T extends AnyContainer>({
	contextGuid,
	filters,
	limit,
	offset,
	signal,
	sort
}: FetchContainerPageOptions) {
	const params = new URLSearchParams();

	if (contextGuid) {
		params.set('contextGuid', contextGuid);
	}

	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			for (const singleValue of value) {
				params.append(key, singleValue);
			}
		} else {
			params.append(key, value);
		}
	}

	if (sort) {
		params.set('sort', sort);
	}
	params.set('limit', String(limit));
	params.set('offset', String(offset));

	const response = await fetch(`/container/v2?${params.toString()}`, { signal });
	if (!response.ok) {
		throw new Error(
			`Failed to fetch container page: ${response.status} ${await response.clone().text()}`
		);
	}

	const parsed = responseSchema.parse(await response.json());
	return {
		...parsed,
		containers: parsed.containers as T[]
	};
}
