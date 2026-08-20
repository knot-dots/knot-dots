import { z } from 'zod';
import withRequestCoalescing from '$lib/client/withRequestCoalescing';
import { type AnyPayload, type Container, container } from '$lib/models';

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

	const params = new URLSearchParams();
	for (const guid of [...batch.keys()].sort()) {
		params.append('relatedTo', guid);
	}

	try {
		const response = await withRequestCoalescing(fetch)(`/container/progress?${params}`, {
			credentials: 'include'
		});
		if (!response.ok) {
			throw new Error(
				`Failed to fetch computed progress: ${response.status} ${await response.clone().text()}`
			);
		}
		const containers = z.array(container).parse(await response.clone().json());
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
