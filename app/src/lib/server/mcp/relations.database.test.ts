import { v4 as uuid } from 'uuid';
import { expect, vi } from 'vitest';
import { z } from 'zod';

const { enqueueIndexingEvent, enqueueIndexingEvents } = vi.hoisted(() => ({
	enqueueIndexingEvent: vi.fn(),
	enqueueIndexingEvents: vi.fn()
}));

vi.mock('$lib/server/indexingQueue', () => ({ enqueueIndexingEvent, enqueueIndexingEvents }));

import { type Fixtures, test } from '$lib/fixtures';
import { newContainer, payloadTypes, predicates, type Predicate } from '$lib/models';
import { createContainer, createMcpToken, createOrUpdateUser, sql } from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	containerRelationChangeInput,
	listContainerRelationsInput
} from '$lib/server/mcp/contracts/relations';
import {
	addMcpContainerRelation,
	listMcpContainerRelations,
	removeMcpContainerRelation
} from '$lib/server/mcp/relations';
import { generateMcpToken } from '$lib/server/mcp/tokens';

const realm = 'test';

async function createTestAuth(connection: Fixtures['connection']): Promise<McpAuth> {
	const userId = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid: userId, realm, settings: {} })(
		connection
	);
	const { prefix, secretHash } = generateMcpToken();
	const token = await createMcpToken({
		name: 'Test token',
		prefix,
		scopes: ['containers:write'],
		secretHash,
		userId
	})(connection);
	return { tokenId: token.id, userId };
}

async function createOrganization(
	connection: Fixtures['connection'],
	member: string,
	role: Predicate
) {
	const guid = uuid();
	const { revision } = await connection.one(sql.typeAlias('revision')`
		INSERT INTO container (guid, managed_by, organization, payload, realm)
		VALUES (
			${guid},
			${guid},
			${guid},
			${sql.jsonb({ name: 'Test organization', type: payloadTypes.enum.organization })},
			${realm}
		)
		RETURNING revision
	`);

	await connection.query(sql.typeAlias('void')`
		INSERT INTO container_user (object, predicate, subject)
		VALUES
			(${revision}, ${predicates.enum['is-member-of']}, ${member}),
			(${revision}, ${role}, ${member})
		ON CONFLICT DO NOTHING
	`);

	return guid;
}

function createGoal(connection: Fixtures['connection'], organization: string, title: string) {
	return createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: { title, type: payloadTypes.enum.goal },
			realm,
			relation: [],
			user: []
		})
	)(connection);
}

async function setUp(connection: Fixtures['connection'], role: Predicate) {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(connection, auth.userId, role);
	const subject = await createGoal(connection, organization, 'Less traffic');
	const object = await createGoal(connection, organization, 'Clean air');
	return { auth, object, organization, subject };
}

function relationInput(subjectGuid: string, predicate: string, objectGuid: string) {
	return containerRelationChangeInput.parse({ objectGuid, predicate, subjectGuid });
}

function listRelations(connection: Fixtures['connection'], guid: string, userId: string) {
	return listMcpContainerRelations({
		...listContainerRelationsInput.parse({ guid }),
		userId
	})(connection);
}

async function findWriteEvents(connection: Fixtures['connection'], tokenId: string) {
	return connection.any(sql.type(
		z.object({
			container_guid: z.uuid(),
			predicate: z.string().nullable(),
			related_container_guid: z.uuid().nullable(),
			revision: z.number().nullable(),
			tool: z.string()
		})
	)`
		SELECT container_guid, predicate, related_container_guid, revision, tool
		FROM mcp_write_event
		WHERE token_id = ${tokenId}
		ORDER BY tool
	`);
}

async function countRelationRows(
	connection: Fixtures['connection'],
	subject: string,
	predicate: string,
	object: string
) {
	return connection.oneFirst(sql.type(z.object({ count: z.number() }))`
		SELECT count(*)::int AS count
		FROM container_relation
		WHERE subject = ${subject} AND predicate = ${predicate} AND object = ${object}
	`);
}

test('adds a relation, lists it from both ends and records the write', async ({
	connection
}: Fixtures) => {
	const { auth, object, subject } = await setUp(connection, predicates.enum['is-collaborator-of']);
	const input = relationInput(subject.guid, predicates.enum['contributes-to'], object.guid);

	await expect(addMcpContainerRelation({ ...input, ...auth })(connection)).resolves.toEqual({
		changed: true,
		relation: input
	});
	await expect(addMcpContainerRelation({ ...input, ...auth })(connection)).resolves.toMatchObject({
		changed: false
	});

	await expect(listRelations(connection, subject.guid, auth.userId)).resolves.toMatchObject({
		relations: [
			{
				container: { guid: object.guid, label: 'Clean air' },
				direction: 'outgoing',
				predicate: predicates.enum['contributes-to']
			}
		]
	});
	await expect(listRelations(connection, object.guid, auth.userId)).resolves.toMatchObject({
		relations: [{ container: { guid: subject.guid }, direction: 'incoming' }]
	});
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual([
		{
			container_guid: subject.guid,
			predicate: predicates.enum['contributes-to'],
			related_container_guid: object.guid,
			revision: null,
			tool: 'add_container_relation'
		}
	]);
});

test('removes a symmetric relation stored in the other direction without stray tombstones', async ({
	connection
}: Fixtures) => {
	const { auth, object, subject } = await setUp(connection, predicates.enum['is-collaborator-of']);
	const predicate = predicates.enum['is-consistent-with'];
	await addMcpContainerRelation({
		...relationInput(object.guid, predicate, subject.guid),
		...auth
	})(connection);

	await expect(
		removeMcpContainerRelation({ ...relationInput(subject.guid, predicate, object.guid), ...auth })(
			connection
		)
	).resolves.toEqual({
		changed: true,
		relation: { objectGuid: subject.guid, predicate, subjectGuid: object.guid }
	});
	await expect(
		removeMcpContainerRelation({ ...relationInput(subject.guid, predicate, object.guid), ...auth })(
			connection
		)
	).resolves.toMatchObject({ changed: false });

	await expect(listRelations(connection, subject.guid, auth.userId)).resolves.toMatchObject({
		relations: []
	});
	// the relation was never stored in the requested direction
	await expect(countRelationRows(connection, subject.guid, predicate, object.guid)).resolves.toBe(
		0
	);
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toMatchObject([
		{ tool: 'add_container_relation' },
		{
			container_guid: object.guid,
			related_container_guid: subject.guid,
			tool: 'remove_container_relation'
		}
	]);
});

test('rolls the relation back if the write event cannot be recorded', async ({
	connection
}: Fixtures) => {
	const { auth, object, subject } = await setUp(connection, predicates.enum['is-collaborator-of']);
	const input = relationInput(subject.guid, predicates.enum['contributes-to'], object.guid);

	// An unknown token violates the foreign key of the write event.
	await expect(
		addMcpContainerRelation({ ...input, ...auth, tokenId: uuid() })(connection)
	).rejects.toThrow();
	await expect(listRelations(connection, subject.guid, auth.userId)).resolves.toMatchObject({
		relations: []
	});
});

test('rejects relation changes by a user who may only observe the organization', async ({
	connection
}: Fixtures) => {
	const { auth, object, subject } = await setUp(connection, predicates.enum['is-member-of']);

	await expect(
		addMcpContainerRelation({
			...relationInput(subject.guid, predicates.enum['contributes-to'], object.guid),
			...auth
		})(connection)
	).rejects.toThrow('You are not allowed to change the relations of these containers.');
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual([]);
});

test('rejects relations between containers of different organizations', async ({
	connection
}: Fixtures) => {
	const { auth, subject } = await setUp(connection, predicates.enum['is-collaborator-of']);
	const otherOrganization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-collaborator-of']
	);
	const foreign = await createGoal(connection, otherOrganization, 'Elsewhere');

	await expect(
		addMcpContainerRelation({
			...relationInput(subject.guid, predicates.enum['contributes-to'], foreign.guid),
			...auth
		})(connection)
	).rejects.toThrow('Both containers must belong to the same organization.');
});
