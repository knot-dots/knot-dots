import { z } from 'zod';
import { type AnyContainer, anyContainer } from '$lib/models';
import type { PayloadType } from '$lib/models';

// In-flight request deduplication to avoid firing identical concurrent network requests.
// Cache entry retains the promise while in-flight and the resolved result until TTL expires.
interface CacheEntry {
	promise: Promise<AnyContainer[]>;
	inserted: number; // ms timestamp when the request was initiated
	result?: AnyContainer[]; // populated once promise resolves
}
const inflight = new Map<string, CacheEntry>();

export default async function fetchContainers(
	filters: {
		assignee?: string[];
		audience?: string[];
		category?: string[];
		indicatorCategory?: string[];
		indicatorType?: string[];
		isPartOfMeasure?: string[];
		isPartOfProgram?: string[];
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
	const url = `/container?${params}`;
	const now = Date.now();

	const existing = inflight.get(url);
	if (existing) {
		// If we have a resolved result and it's still within TTL (2s), serve from cache.
		if (existing.result && now - existing.inserted < 2000) {
			return existing.result;
		}
		// If still in-flight (no result yet), just return that promise.
		if (!existing.result) {
			return existing.promise;
		}
		// Expired entry with a result: drop it and proceed to refetch.
		inflight.delete(url);
	}

	// Create new entry
	// Declare then assign to allow closure to mutate entry.result post resolution
	const entry: CacheEntry = {
		inserted: now,
		promise: Promise.resolve([] as AnyContainer[]) // placeholder, replaced immediately
	};
	entry.promise = (async () => {
		const response = await fetch(url, {
			cache: 'default',
			credentials: 'same-origin'
		});
		const data = await response.json();
		const parsed = z.array(anyContainer).parse(data);
		entry.result = parsed; // store resolved data for TTL reuse
		return parsed;
	})();
	inflight.set(url, entry);

	// Return the promise (callers can await). Subsequent identical calls within 2s will reuse result.
	return entry.promise;
}
