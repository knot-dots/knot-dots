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
import { createContainerInput } from '$lib/server/mcp/contracts/creation';
import { createMcpContainer } from '$lib/server/mcp/creation';
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

async function findWriteEvents(connection: Fixtures['connection'], tokenId: string) {
	return connection.any(sql.type(
		z.object({
			container_guid: z.uuid(),
			revision: z.number().nullable(),
			tool: z.string(),
			user_id: z.uuid()
		})
	)`
		SELECT container_guid, revision, tool, user_id
		FROM mcp_write_event
		WHERE token_id = ${tokenId}
		ORDER BY created_at, revision
	`);
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

async function createProgram(connection: Fixtures['connection'], organization: string) {
	return createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: { title: 'Climate program', type: payloadTypes.enum.program },
			realm,
			relation: [],
			user: []
		})
	)(connection);
}

function createGoalUnder(organizationGuid: string, parentGuid: string, auth: McpAuth) {
	return createMcpContainer({
		...createContainerInput.parse({
			organizationGuid,
			parentRelations: [{ parentGuid, predicate: predicates.enum['is-part-of-program'] }],
			payload: { title: 'Climate goal', type: payloadTypes.enum.goal }
		}),
		...auth
	});
}

test('creates containers under a structural parent with appended positions', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-collaborator-of']
	);
	const program = await createProgram(connection, organization);

	const first = await createGoalUnder(organization, program.guid, auth)(connection);
	const second = await createGoalUnder(organization, program.guid, auth)(connection);

	expect(first).toMatchObject({
		organization,
		organizational_unit: null,
		payload: { title: 'Climate goal', type: payloadTypes.enum.goal }
	});
	expect(first.relation).toContainEqual(
		expect.objectContaining({
			object: program.guid,
			position: 0,
			predicate: predicates.enum['is-part-of-program'],
			subject: first.guid
		})
	);
	expect(second.relation).toContainEqual(
		expect.objectContaining({
			object: program.guid,
			position: 1,
			predicate: predicates.enum['is-part-of-program'],
			subject: second.guid
		})
	);
	expect(first.user).toContainEqual({
		predicate: predicates.enum['is-creator-of'],
		subject: auth.userId
	});
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual(
		[first, second].map(({ guid, revision }) => ({
			container_guid: guid,
			revision,
			tool: 'create_container',
			user_id: auth.userId
		}))
	);
});

test('rejects creation for a user who may only observe the organization', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-member-of']
	);
	const program = await createProgram(connection, organization);

	await expect(createGoalUnder(organization, program.guid, auth)(connection)).rejects.toThrow(
		'You are not allowed to create content in this context.'
	);
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual([]);
});

test('rejects a visible parent that belongs to another organization', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-collaborator-of']
	);
	const otherOrganization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-collaborator-of']
	);
	const foreignProgram = await createProgram(connection, otherOrganization);

	await expect(
		createGoalUnder(organization, foreignProgram.guid, auth)(connection)
	).rejects.toThrow('Parent container not found or inaccessible.');
});
