import { z } from 'zod';
import { page } from '$app/state';
import { binaryIndicatorPayload, createContainerSchema, indicatorPayload } from '$lib/models';

const responseSchema = z.object({
	facets: z
		.record(z.string(), z.record(z.string(), z.number()))
		.transform(
			(record) =>
				new Map(
					Object.entries(record).map(([key, values]) => [key, new Map(Object.entries(values))])
				)
		),
	page: z.object({
		hasMore: z.boolean(),
		limit: z.number(),
		nextOffset: z.number().nullable(),
		offset: z.number(),
		total: z.number()
	}),
	suggestions: z.array(
		z.object({
			indicator: z.union([
				createContainerSchema(indicatorPayload),
				createContainerSchema(binaryIndicatorPayload)
			]),
			relevance: z.number()
		})
	)
});

export default async function fetchSuggestedContainers(
	guid: string,
	filters: {
		[key: string]: string | string[] | undefined;
		indicatorCategory?: string[];
		indicatorType?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		terms?: string;
	},
	{ limit, offset }: { limit: number; offset: number },
	init?: RequestInit
) {
	const params = new URLSearchParams();
	for (const key of page.data.categoryContext.keys) {
		for (const value of (filters[key] as string[]) ?? []) {
			params.append(key, value);
		}
	}
	for (const value of filters.indicatorCategory ?? []) {
		params.append('indicatorCategory', value);
	}
	for (const value of filters.indicatorType ?? []) {
		params.append('indicatorType', value);
	}
	for (const value of filters.organization ?? []) {
		params.append('organization', value);
	}
	for (const value of filters.organizationalUnit ?? []) {
		params.append('organizationalUnit', value);
	}
	if (filters.terms) {
		params.append('terms', filters.terms);
	}
	params.set('limit', String(limit));
	params.set('offset', String(offset));
	const response = await fetch(`/container/${guid}/suggestion?${params}`, init);
	if (!response.ok) {
		throw new Error(`Failed to fetch suggestions: ${response.status} ${await response.text()}`);
	}
	return responseSchema.parse(await response.json());
}
