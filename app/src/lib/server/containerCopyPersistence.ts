import type { AnyPayload, Container } from '$lib/models';
import type { ContainerCopyPlan } from '$lib/server/containerCopyPlan';
import { createManyContainers, type DatabaseNonTransactionConnection } from '$lib/server/db';
import { enqueueIndexingEvents } from '$lib/server/indexingQueue';

/**
 * Atomically persists a validated copy plan, then schedules indexing only after PostgreSQL commits.
 * Without a transactional outbox, a process or queue failure after commit can still leave the search
 * index stale; enqueueIndexingEvents logs and reports those failures without undoing committed rows.
 */
export function persistContainerCopyPlan(plan: ContainerCopyPlan) {
	const createContainers = createManyContainers([...plan.values()]);

	return async (
		connection: DatabaseNonTransactionConnection
	): Promise<ReadonlyMap<string, Container<AnyPayload>>> => {
		if (plan.size === 0) {
			return new Map();
		}

		const { affectedIndexingGuids, persistedCopies } = await connection.transaction(
			async (connection) => {
				const result = await createContainers(connection);
				const containerByGuid = new Map(
					result.containers.map((container) => [container.guid, container])
				);
				const copies = new Map<string, Container<AnyPayload>>();
				for (const [originalGuid, plannedContainer] of plan) {
					const container = containerByGuid.get(plannedContainer.guid);
					if (!container) {
						throw new Error(`Missing persisted copy for ${plannedContainer.guid}`);
					}
					copies.set(originalGuid, container);
				}

				return {
					affectedIndexingGuids: result.affectedIndexingGuids,
					persistedCopies: copies
				};
			}
		);

		const timestamp = new Date().toISOString();
		await enqueueIndexingEvents(
			affectedIndexingGuids.map((guid) => ({ action: 'upsert', guid, timestamp }))
		);

		return persistedCopies;
	};
}
