import type { AnyPayload, Container } from '$lib/models';

const confirmed = new Set<string>();

export default function withOptimistic<T extends Container<AnyPayload>>(
	containers: T[],
	created: Map<string, Container<AnyPayload>>,
	deleted: Map<string, Container<AnyPayload>>,
	updated: Map<string, Container<AnyPayload>>,
	createdFilter?: (container: Container<AnyPayload>) => boolean
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

	const present = new Set(result.map(({ guid }) => guid));

	const pending: T[] = [];
	for (const container of created.values()) {
		if (present.has(container.guid)) {
			confirmed.add(container.guid);
			continue;
		}
		if (confirmed.has(container.guid)) {
			continue;
		}
		if (createdFilter && !createdFilter(container)) {
			continue;
		}
		pending.push(container as T);
	}

	return [...result, ...pending].filter((c) => !deleted.has(c.guid));
}
