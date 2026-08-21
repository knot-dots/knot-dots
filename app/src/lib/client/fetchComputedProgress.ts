import fetchContainers from '$lib/client/fetchContainers';
import { type AnyPayload, type Container, payloadTypes, predicates } from '$lib/models';

type Waiter = {
	resolve: (containers: Container<AnyPayload>[]) => void;
	reject: (reason: unknown) => void;
};

let queue = new Map<string, Waiter[]>();

export default function fetchComputedProgress(guid: string): Promise<Container<AnyPayload>[]> {
	return new Promise((resolve, reject) => {
		if (queue.size == 0) {
			queueMicrotask(flush);
		}
		queue.set(guid, [...(queue.get(guid) ?? []), { resolve, reject }]);
	});
}

async function flush() {
	const batch = queue;
	queue = new Map();

	try {
		const containers = await fetchContainers({
			payloadType: [
				payloadTypes.enum.progress,
				payloadTypes.enum.goal,
				payloadTypes.enum.measure,
				payloadTypes.enum.simple_measure,
				payloadTypes.enum.task
			],
			relatedTo: [...batch.keys()].sort(),
			relationType: [predicates.enum['is-part-of'], predicates.enum['is-section-of']]
		});
		for (const waiters of batch.values()) {
			for (const { resolve } of waiters) {
				resolve(containers);
			}
		}
	} catch (reason) {
		for (const waiters of batch.values()) {
			for (const { reject } of waiters) {
				reject(reason);
			}
		}
	}
}
