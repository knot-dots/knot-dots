import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { z } from 'zod';
import { type Fixtures, test } from '$lib/fixtures';
import { payloadTypes, predicates, type Visibility, visibility } from '$lib/models';
import { createOrUpdateUser, sql } from '$lib/server/db';
import { getMcpContainer } from '$lib/server/mcp/containers';

const realm = 'test';

async function createTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

async function createOrganization(connection: Fixtures['connection'], member: string) {
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
		VALUES (${revision}, ${predicates.enum['is-member-of']}, ${member})
	`);
	await connection.query(sql.typeAlias('void')`
		INSERT INTO container_grant (kind, object, subject, target)
		VALUES ('read', ${guid}, ${member}, 'self'), ('read', ${guid}, ${member}, 'subordinates')
	`);

	return guid;
}

async function createGoal(
	connection: Fixtures['connection'],
	organization: string,
	goalVisibility: Visibility
) {
	const { guid } = await connection.one(sql.type(z.object({ guid: z.uuid() }))`
		INSERT INTO container (managed_by, organization, payload, realm)
		VALUES (
			${organization},
			${organization},
			${sql.jsonb({
				aiContribution: 0,
				aiSuggestion: false,
				category: {},
				hierarchyLevel: 1,
				status: 'status.idea',
				template: false,
				title: 'Test goal',
				type: payloadTypes.enum.goal,
				visibility: goalVisibility
			})},
			${realm}
		)
		RETURNING guid
	`);

	return guid;
}

test('gets only containers visible to the authenticated MCP user', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const organization = await createOrganization(connection, member);
	const visible = await createGoal(connection, organization, visibility.enum.organization);
	const hidden = await createGoal(connection, organization, visibility.enum.creator);

	await expect(
		getMcpContainer({ guid: visible, userId: member })(connection)
	).resolves.toMatchObject({
		guid: visible,
		payload: { type: payloadTypes.enum.goal }
	});
	await expect(getMcpContainer({ guid: hidden, userId: member })(connection)).resolves.toBeNull();
	await expect(getMcpContainer({ guid: uuid(), userId: member })(connection)).resolves.toBeNull();
});
