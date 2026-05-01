import { z } from 'zod';
import { anyContainer, type AnyContainer } from '$lib/models';

interface FetchContainerPageOptions {
	contextGuid?: string;
	fetch: typeof fetch;
	limit: number;
	offset: number;
	query: URLSearchParams;
	signal?: AbortSignal;
}

const responseSchema = z.object({
	categoryOptions: z
		.record(
			z.string(),
			z.array(
				z.object({
					guid: z.string(),
					icon: z.url().optional(),
					label: z.string(),
					value: z.string()
				})
			)
		)
		.and(z.object({ __categoryLabels__: z.record(z.string(), z.string()).optional() }))
		.optional(),
	containers: z.array(anyContainer),
	facets: z
		.record(z.string(), z.record(z.string(), z.number()))
		.transform(
			(record) =>
				new Map(
					Object.entries(record).map(([key, values]) => [key, new Map(Object.entries(values))])
				)
		),
	facetLabels: z
		.record(z.string(), z.string())
		.transform((record) => (record ? new Map(Object.entries(record)) : undefined))
		.optional(),
	page: z.object({
		hasMore: z.boolean(),
		limit: z.number(),
		nextOffset: z.number().nullable(),
		offset: z.number()
	})
});

export default async function fetchContainerPage<T extends AnyContainer>({
	contextGuid,
	fetch,
	limit,
	offset,
	query,
	signal
}: FetchContainerPageOptions) {
	const params = new URLSearchParams(query);

	if (contextGuid) {
		params.set('contextGuid', contextGuid);
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
