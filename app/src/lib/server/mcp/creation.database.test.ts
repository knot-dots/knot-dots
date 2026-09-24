import { v4 as uuid } from 'uuid';
import { expect, vi } from 'vitest';

const { enqueueIndexingEvent, enqueueIndexingEvents } = vi.hoisted(() => ({
	enqueueIndexingEvent: vi.fn(),
	enqueueIndexingEvents: vi.fn()
}));

vi.mock('$lib/server/indexingQueue', () => ({ enqueueIndexingEvent, enqueueIndexingEvents }));

import { type Fixtures, test } from '$lib/fixtures';
import { newContainer, payloadTypes, predicates, type Predicate } from '$lib/models';
import { createContainer, createOrUpdateUser, sql } from '$lib/server/db';
import { createContainerInput } from '$lib/server/mcp/contracts/creation';
import { createMcpContainer } from '$lib/server/mcp/creation';

const realm = 'test';

async function createTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
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

function createGoalUnder(organizationGuid: string, parentGuid: string, userId: string) {
	return createMcpContainer({
		...createContainerInput.parse({
			organizationGuid,
			parentRelations: [{ parentGuid, predicate: predicates.enum['is-part-of-program'] }],
			payload: { title: 'Climate goal', type: payloadTypes.enum.goal }
		}),
		userId
	});
}

test('creates containers under a structural parent with appended positions', async ({
	connection
}: Fixtures) => {
	const user = await createTestUser(connection);
	const organization = await createOrganization(
		connection,
		user,
		predicates.enum['is-collaborator-of']
	);
	const program = await createProgram(connection, organization);

	const first = await createGoalUnder(organization, program.guid, user)(connection);
	const second = await createGoalUnder(organization, program.guid, user)(connection);

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
		subject: user
	});
});

test('rejects creation for a user who may only observe the organization', async ({
	connection
}: Fixtures) => {
	const user = await createTestUser(connection);
	const organization = await createOrganization(connection, user, predicates.enum['is-member-of']);
	const program = await createProgram(connection, organization);

	await expect(createGoalUnder(organization, program.guid, user)(connection)).rejects.toThrow(
		'You are not allowed to create content in this context.'
	);
});

test('rejects a visible parent that belongs to another organization', async ({
	connection
}: Fixtures) => {
	const user = await createTestUser(connection);
	const organization = await createOrganization(
		connection,
		user,
		predicates.enum['is-collaborator-of']
	);
	const otherOrganization = await createOrganization(
		connection,
		user,
		predicates.enum['is-collaborator-of']
	);
	const foreignProgram = await createProgram(connection, otherOrganization);

	await expect(
		createGoalUnder(organization, foreignProgram.guid, user)(connection)
	).rejects.toThrow('Parent container not found or inaccessible.');
});
