import type { DatabaseTransactionConnection } from 'slonik';
import { v4 as uuid } from 'uuid';
import { beforeEach, expect, vi } from 'vitest';

const { enqueueIndexingEvent, enqueueIndexingEvents } = vi.hoisted(() => ({
	enqueueIndexingEvent: vi.fn(),
	enqueueIndexingEvents: vi.fn()
}));

vi.mock('$lib/server/indexingQueue', () => ({ enqueueIndexingEvent, enqueueIndexingEvents }));

import { test } from '$lib/fixtures';
import {
	type AnyPayload,
	newContainer,
	payloadTypes,
	predicates,
	relation,
	type Relation
} from '$lib/models';
import type { ContainerCopyPlan } from '$lib/server/containerCopyPlan';
import {
	createContainer,
	createManyContainers,
	createOrUpdateUser,
	type DatabaseNonTransactionConnection,
	sql
} from '$lib/server/db';
import { persistContainerCopyPlan } from '$lib/server/containerCopyPersistence';

const organization = uuid();
const realm = 'test';

beforeEach(() => {
	enqueueIndexingEvent.mockReset().mockResolvedValue({ failed: 0, successful: 1 });
	enqueueIndexingEvents.mockReset().mockResolvedValue({ failed: 0, successful: 0 });
});

function copyContainer(
	type: AnyPayload['type'],
	options: {
		guid?: string;
		managedBy?: string;
		organization?: string;
		organizationalUnit?: string | null;
		relation?: Relation[];
		user?: Array<{ predicate: 'is-creator-of'; subject: string }>;
	} = {}
) {
	const payload =
		type === payloadTypes.enum.organizational_unit
			? { name: 'Copied unit', type }
			: type === payloadTypes.enum.organization
				? { name: 'Copied organization', type }
				: { title: 'Copied container', type };

	const guid = options.guid ?? uuid();
	const relations = options.relation ?? [];
	return {
		...newContainer.parse({
			guid,
			managed_by: options.managedBy ?? organization,
			organization: options.organization ?? organization,
			organizational_unit: options.organizationalUnit ?? null,
			payload,
			realm,
			relation: relations,
			user: options.user ?? []
		}),
		guid,
		relation: relations
	};
}

async function createTestUser(connection: DatabaseTransactionConnection) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

test('bulk-inserts payloads, creators, GUID relations, and reconstructs containers', async ({
	connection
}) => {
	const creator = await createTestUser(connection);
	const originalProgram = uuid();
	const originalMeasure = uuid();
	const copiedProgram = uuid();
	const copiedMeasure = uuid();
	const programCopyRelation: Relation = {
		object: originalProgram,
		position: 0,
		predicate: predicates.enum['is-copy-of'],
		subject: copiedProgram
	};
	const measureRelations: Relation[] = [
		{
			object: originalMeasure,
			position: 0,
			predicate: predicates.enum['is-copy-of'],
			subject: copiedMeasure
		},
		{
			object: copiedProgram,
			position: 7,
			predicate: predicates.enum['is-part-of-program'],
			subject: copiedMeasure
		}
	];

	const result = await createManyContainers([
		copyContainer(payloadTypes.enum.program, {
			guid: copiedProgram,
			relation: [programCopyRelation],
			user: [{ predicate: predicates.enum['is-creator-of'], subject: creator }]
		}),
		copyContainer(payloadTypes.enum.measure, {
			guid: copiedMeasure,
			relation: measureRelations,
			user: [{ predicate: predicates.enum['is-creator-of'], subject: creator }]
		})
	])(connection);

	expect(result.containers.map(({ guid }) => guid)).toEqual([copiedProgram, copiedMeasure]);
	expect(result.containers.map(({ user }) => user)).toEqual([
		[{ predicate: predicates.enum['is-creator-of'], subject: creator }],
		[{ predicate: predicates.enum['is-creator-of'], subject: creator }]
	]);
	expect(result.containers[0].relation).toEqual([programCopyRelation, measureRelations[1]]);
	expect(result.containers[1].relation).toEqual(measureRelations);
	expect(new Set(result.affectedIndexingGuids)).toEqual(
		new Set([copiedProgram, copiedMeasure, originalProgram, originalMeasure])
	);

	const stored = await connection.any(sql.type(
		newContainer.pick({ managed_by: true }).extend({ guid: newContainer.shape.organization })
	)`
		SELECT guid, managed_by
		FROM container
		WHERE guid = ANY(${sql.array([copiedProgram, copiedMeasure], 'uuid')})
		ORDER BY guid
	`);
	expect(stored).toHaveLength(2);
	expect(stored.every(({ managed_by }) => managed_by[0] === organization)).toBe(true);
});

test('preserves inserted and existing program positions without shifting siblings', async ({
	connection
}) => {
	const program = await createContainer(copyContainer(payloadTypes.enum.program))(connection);
	const existingGuids: string[] = [];
	for (const position of [0, 1, 2]) {
		const existing = await createContainer(
			newContainer.parse({
				...copyContainer(payloadTypes.enum.measure),
				relation: [
					{
						object: program.guid,
						position,
						predicate: predicates.enum['is-part-of-program']
					}
				]
			})
		)(connection);
		existingGuids.push(existing.guid);
	}

	const firstInserted = uuid();
	const secondInserted = uuid();
	await createManyContainers([
		copyContainer(payloadTypes.enum.measure, {
			guid: firstInserted,
			relation: [
				{
					object: program.guid,
					position: 0,
					predicate: predicates.enum['is-part-of-program'],
					subject: firstInserted
				}
			]
		}),
		copyContainer(payloadTypes.enum.goal, {
			guid: secondInserted,
			relation: [
				{
					object: program.guid,
					position: 2,
					predicate: predicates.enum['is-part-of-program'],
					subject: secondInserted
				}
			]
		})
	])(connection);

	const positions = await connection.any(sql.type(relation)`
		SELECT object, position, predicate, subject
		FROM container_relation
		WHERE object = ${program.guid}
			AND predicate = ${predicates.enum['is-part-of-program']}
			AND valid_currently
			AND NOT deleted
	`);
	const positionBySubject = new Map(positions.map(({ position, subject }) => [subject, position]));
	expect(positionBySubject.get(firstInserted)).toBe(0);
	expect(positionBySubject.get(secondInserted)).toBe(2);
	expect(existingGuids.map((guid) => positionBySubject.get(guid))).toEqual([0, 1, 2]);
});

test('rolls back rows and users when a creator or relation insert fails', async ({
	connection
}) => {
	const copiedGuid = uuid();
	const missingCreator = uuid();
	await expect(
		connection.transaction((nested) =>
			createManyContainers([
				copyContainer(payloadTypes.enum.program, {
					guid: copiedGuid,
					user: [{ predicate: predicates.enum['is-creator-of'], subject: missingCreator }]
				})
			])(nested)
		)
	).rejects.toThrow();
	expect(
		await connection.maybeOneFirst(sql.typeAlias('guid')`
			SELECT guid FROM container WHERE guid = ${copiedGuid}
		`)
	).toBeNull();

	const existingObject = await createContainer(copyContainer(payloadTypes.enum.program))(
		connection
	);
	const existingSubject = await createContainer(copyContainer(payloadTypes.enum.measure))(
		connection
	);
	const existingRelation: Relation = {
		object: existingObject.guid,
		position: 0,
		predicate: predicates.enum['is-part-of'],
		subject: existingSubject.guid
	};
	await connection.query(sql.typeAlias('void')`
		INSERT INTO container_relation (object, position, predicate, subject)
		VALUES (
			${existingRelation.object},
			${existingRelation.position},
			${existingRelation.predicate},
			${existingRelation.subject}
		)
	`);

	const relationConflictGuid = uuid();
	await expect(
		connection.transaction((nested) =>
			createManyContainers([
				copyContainer(payloadTypes.enum.text, {
					guid: relationConflictGuid,
					relation: [existingRelation]
				})
			])(nested)
		)
	).rejects.toThrow('relation_conflict');
	expect(
		await connection.maybeOneFirst(sql.typeAlias('guid')`
			SELECT guid FROM container WHERE guid = ${relationConflictGuid}
		`)
	).toBeNull();
});

test('handles empty input and keeps organizations outside the generic writer', async ({
	connection
}) => {
	await expect(createManyContainers([])(connection)).resolves.toEqual({
		affectedIndexingGuids: [],
		containers: []
	});
	expect(() => createManyContainers([copyContainer(payloadTypes.enum.organization)])).toThrow(
		'organization_not_supported'
	);

	const organizationalUnit = copyContainer(payloadTypes.enum.organizational_unit);
	await expect(createManyContainers([organizationalUnit])(connection)).resolves.toMatchObject({
		containers: [{ guid: organizationalUnit.guid }]
	});
});

test('persists the plan mapping and queues deduplicated events after the transaction resolves', async ({
	connection
}) => {
	const creator = await createTestUser(connection);
	const originalGuid = uuid();
	const copiedGuid = uuid();
	const relation: Relation = {
		object: originalGuid,
		position: 0,
		predicate: predicates.enum['is-copy-of'],
		subject: copiedGuid
	};
	const planned = copyContainer(payloadTypes.enum.program, {
		guid: copiedGuid,
		relation: [relation],
		user: [{ predicate: predicates.enum['is-creator-of'], subject: creator }]
	});
	const plan: ContainerCopyPlan = new Map([[originalGuid, planned]]);
	let transactionResolved = false;
	const nonTransactionConnection = {
		transaction: async <T>(
			handler: Parameters<DatabaseNonTransactionConnection['transaction']>[0]
		) => {
			const result = (await connection.transaction(handler)) as T;
			transactionResolved = true;
			return result;
		}
	} as DatabaseNonTransactionConnection;
	enqueueIndexingEvents.mockImplementationOnce(async () => {
		expect(transactionResolved).toBe(true);
		return { failed: 0, successful: 2 };
	});

	const result = await persistContainerCopyPlan(plan)(nonTransactionConnection);
	expect(result.get(originalGuid)).toMatchObject({ guid: copiedGuid });
	expect(enqueueIndexingEvents).toHaveBeenCalledOnce();
	expect(
		new Set(enqueueIndexingEvents.mock.calls[0][0].map(({ guid }: { guid: string }) => guid))
	).toEqual(new Set([copiedGuid, originalGuid]));
});

test('returns an empty map without opening a transaction or enqueueing', async () => {
	const transaction = vi.fn();
	const nonTransactionConnection = {
		transaction
	} as unknown as DatabaseNonTransactionConnection;

	const result = await persistContainerCopyPlan(new Map())(nonTransactionConnection);

	expect(result).toEqual(new Map());
	expect(transaction).not.toHaveBeenCalled();
	expect(enqueueIndexingEvents).not.toHaveBeenCalled();
});

test('does not enqueue when the persistence transaction rolls back', async ({ connection }) => {
	const originalGuid = uuid();
	const copiedGuid = uuid();
	const missingCreator = uuid();
	const planned = copyContainer(payloadTypes.enum.program, {
		guid: copiedGuid,
		relation: [
			{
				object: originalGuid,
				position: 0,
				predicate: predicates.enum['is-copy-of'],
				subject: copiedGuid
			}
		],
		user: [{ predicate: predicates.enum['is-creator-of'], subject: missingCreator }]
	});
	const plan: ContainerCopyPlan = new Map([[originalGuid, planned]]);
	const nonTransactionConnection = {
		transaction: <T>(handler: Parameters<DatabaseNonTransactionConnection['transaction']>[0]) =>
			connection.transaction(handler) as Promise<T>
	} as unknown as DatabaseNonTransactionConnection;

	await expect(persistContainerCopyPlan(plan)(nonTransactionConnection)).rejects.toThrow();
	expect(enqueueIndexingEvents).not.toHaveBeenCalled();
	expect(
		await connection.maybeOneFirst(sql.typeAlias('guid')`
			SELECT guid FROM container WHERE guid = ${copiedGuid}
		`)
	).toBeNull();
});
