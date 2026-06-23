import type { AnyContainer } from '$lib/models';

const confirmed = new Set<string>();

export default function withOptimistic<T extends AnyContainer>(
	containers: T[],
	created: AnyContainer | undefined,
	deleted: Map<string, AnyContainer>,
	updated: Map<string, AnyContainer>
): T[] {
	let result = containers;

	if (updated.size > 0) {
		result = result.map((c) => {
			const optimistic = updated.get(c.guid);
			if (optimistic && optimistic.revision > c.revision) {
				return optimistic as T;
			}
			return c;
		});
	}

	if (!created) {
		return result.filter((c) => !deleted.has(c.guid));
	}

	if (result.some((c) => c.guid === created.guid)) {
		confirmed.add(created.guid);
		return result.filter((c) => !deleted.has(c.guid));
	}

	if (confirmed.has(created.guid)) {
		return result.filter((c) => !deleted.has(c.guid));
	}

	return [...result, created as T].filter((c) => !deleted.has(c.guid));
}
