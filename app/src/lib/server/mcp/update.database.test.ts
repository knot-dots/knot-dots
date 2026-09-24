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
import {
	ContainerRevisionConflictError,
	createContainer,
	createMcpToken,
	createOrUpdateUser,
	getContainerByGuid,
	sql,
	updateContainerPayload
} from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import { generateMcpToken } from '$lib/server/mcp/tokens';
import { updateMcpContainer } from '$lib/server/mcp/update';

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

function createTestContainer(
	connection: Fixtures['connection'],
	organization: string,
	type: 'goal' | 'program',
	relation: Array<{ object: string; position: number; predicate: Predicate }> = []
) {
	return createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: { title: `Climate ${type}`, type },
			realm,
			relation,
			user: []
		})
	)(connection);
}

async function createProgramWithGoal(connection: Fixtures['connection'], organization: string) {
	const program = await createTestContainer(connection, organization, payloadTypes.enum.program);
	const goal = await createTestContainer(connection, organization, payloadTypes.enum.goal, [
		{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
	]);
	return { goal, program };
}

async function findWriteEvents(connection: Fixtures['connection'], tokenId: string) {
	return connection.any(sql.type(
		z.object({ container_guid: z.uuid(), revision: z.number().nullable(), tool: z.string() })
	)`
		SELECT container_guid, revision, tool
		FROM mcp_write_event
		WHERE token_id = ${tokenId}
	`);
}

const childRelation = (program: string, goal: string) =>
	expect.objectContaining({
		object: program,
		predicate: predicates.enum['is-part-of-program'],
		subject: goal
	});

test('updates the payload and keeps relations, ownership and history', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-collaborator-of']
	);
	const { goal, program } = await createProgramWithGoal(connection, organization);

	const updated = await updateMcpContainer({
		expectedRevision: program.revision,
		guid: program.guid,
		payloadPatch: { title: 'Renamed program' },
		...auth
	})(connection);

	expect(updated.revision).toBeGreaterThan(program.revision);
	const reloaded = await getContainerByGuid(program.guid)(connection);
	expect(reloaded).toMatchObject({
		managed_by: [organization],
		organization,
		payload: { title: 'Renamed program', type: payloadTypes.enum.program },
		revision: updated.revision
	});
	expect(reloaded.relation).toContainEqual(childRelation(program.guid, goal.guid));
	expect((await getContainerByGuid(goal.guid)(connection)).relation).toContainEqual(
		childRelation(program.guid, goal.guid)
	);
	expect(reloaded.user).toContainEqual({
		predicate: predicates.enum['is-creator-of'],
		subject: auth.userId
	});
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual([
		{ container_guid: program.guid, revision: updated.revision, tool: 'update_container' }
	]);
});

test('rejects updates for a revision that is no longer current', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-collaborator-of']
	);
	const { program } = await createProgramWithGoal(connection, organization);
	await updateMcpContainer({
		expectedRevision: program.revision,
		guid: program.guid,
		payloadPatch: { title: 'First change' },
		...auth
	})(connection);

	await expect(
		updateMcpContainer({
			expectedRevision: program.revision,
			guid: program.guid,
			payloadPatch: { title: 'Stale change' },
			...auth
		})(connection)
	).rejects.toThrow(`The container changed since revision ${program.revision}.`);
	await expect(
		updateContainerPayload({
			editorGuid: auth.userId,
			expectedRevision: program.revision,
			guid: program.guid,
			payload: program.payload
		})(connection)
	).rejects.toBeInstanceOf(ContainerRevisionConflictError);
});

test('rejects updates by a user who may only observe the organization', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-member-of']
	);
	const { program } = await createProgramWithGoal(connection, organization);

	await expect(
		updateMcpContainer({
			expectedRevision: program.revision,
			guid: program.guid,
			payloadPatch: { title: 'Renamed program' },
			...auth
		})(connection)
	).rejects.toThrow('You are not allowed to update this container.');
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual([]);
});
