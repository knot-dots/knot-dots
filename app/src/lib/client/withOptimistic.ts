import type { Container } from '$lib/models';

const confirmed = new Set<string>();

export default function withOptimistic<T extends { guid: string }>(
	containers: T[],
	created: Container | undefined
): T[] {
	if (!created) return containers;
	if (containers.some((c) => c.guid === created.guid)) {
		confirmed.add(created.guid);
		return containers;
	}
	if (confirmed.has(created.guid)) return containers;
	return [...containers, created as unknown as T];
}
