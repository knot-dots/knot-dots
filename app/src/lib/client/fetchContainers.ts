import { z } from 'zod';
import { anyContainer } from '$lib/models';
import type { PayloadType } from '$lib/models';

// In-flight request deduplication to avoid firing identical concurrent network requests.
type AnyContainerT = z.infer<typeof anyContainer>;
const inflight = new Map<string, Promise<AnyContainerT[]>>();

export default async function fetchContainers(
	filters: {
		assignee?: string[];
		audience?: string[];
		category?: string[];
		indicatorCategory?: string[];
		indicatorType?: string[];
		isPartOfMeasure?: string[];
		isPartOfProgram?: string[];
		measureType?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		payloadType?: PayloadType[];
		policyFieldBNK?: string[];
		programType?: string[];
		relatedTo?: string[];
		relationType?: string[];
		taskCategory?: string[];
		terms?: string;
		topic?: string[];
		// Optional opt-in cache signal. When present, server sets cacheable headers.
		cache?: string;
	},
	sort?: string
) {
	const params = new URLSearchParams();
	for (const value of filters.assignee ?? []) {
		params.append('assignee', value);
	}
	for (const value of filters.audience ?? []) {
		params.append('audience', value);
	}
	for (const value of filters.category ?? []) {
		params.append('category', value);
	}
	for (const value of filters.indicatorCategory ?? []) {
		params.append('indicatorCategory', value);
	}
	for (const value of filters.indicatorType ?? []) {
		params.append('indicatorType', value);
	}
	for (const value of filters.isPartOfMeasure ?? []) {
		params.append('isPartOfMeasure', String(value));
	}
	for (const value of filters.isPartOfProgram ?? []) {
		params.append('isPartOfProgram', String(value));
	}
	for (const value of filters.measureType ?? []) {
		params.append('measureType', String(value));
	}
	for (const value of filters.organization ?? []) {
		params.append('organization', value);
	}
	for (const value of filters.organizationalUnit ?? []) {
		params.append('organizationalUnit', value);
	}
	for (const value of filters.payloadType ?? []) {
		params.append('payloadType', value);
	}
	for (const value of filters.policyFieldBNK ?? []) {
		params.append('policyFieldBNK', value);
	}
	for (const value of filters.relatedTo ?? []) {
		params.append('relatedTo', value);
	}
	for (const value of filters.relationType ?? []) {
		params.append('relationType', value);
	}
	if (sort) {
		params.append('sort', sort);
	}
	for (const value of filters.programType ?? []) {
		params.append('programType', value);
	}
	for (const value of filters.taskCategory ?? []) {
		params.append('taskCategory', value);
	}
	if (filters.terms) {
		params.append('terms', filters.terms);
	}
	for (const value of filters.topic ?? []) {
		params.append('topic', value);
	}
	if (filters.cache) {
		params.append('cache', filters.cache);
	}
	const url = `/container?${params}`;

	if (inflight.has(url)) return inflight.get(url)!;

	const request: Promise<AnyContainerT[]> = (async () => {
		const response = await fetch(url, {
			// Let the browser use HTTP caching for subsequent identical requests
			cache: 'default',
			credentials: 'same-origin'
		});
		const data = await response.json();
		return z.array(anyContainer).parse(data);
	})();

	inflight.set(url, request);

	try {
		return await request;
	} finally {
		// Ensure the inflight map is cleared after the request settles
		inflight.delete(url);
	}
}
