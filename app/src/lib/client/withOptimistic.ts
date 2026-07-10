import type { AnyPayload, Container } from '$lib/models';

const confirmed = new Set<string>();

export default function withOptimistic<T extends Container<AnyPayload>>(
	containers: T[],
	created: Container<AnyPayload> | undefined,
	deleted: Map<string, Container<AnyPayload>>,
	updated: Map<string, Container<AnyPayload>>
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
