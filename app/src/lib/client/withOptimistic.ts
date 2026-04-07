import type { Container } from '$lib/models';

const confirmed = new Set<string>();

export default function withOptimistic<T extends { guid: string; revision: number }>(
	containers: T[],
	created: Container | undefined,
	updated: Map<string, Container> = new Map()
): T[] {
	let result = containers;

	if (updated.size > 0) {
		result = result.map((c) => {
			const optimistic = updated.get(c.guid);
			if (optimistic && optimistic.revision > c.revision) {
				return optimistic as unknown as T;
			}
			return c;
		});
	}

	if (!created) return result;
	if (result.some((c) => c.guid === created.guid)) {
		confirmed.add(created.guid);
		return result;
	}
	if (confirmed.has(created.guid)) return result;
	return [...result, created as unknown as T];
}
