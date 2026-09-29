import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { z } from 'zod';
import { type Fixtures, test } from '$lib/fixtures';
import {
	organizationalUnitPayload,
	payloadTypes,
	predicates,
	type Visibility,
	visibility
} from '$lib/models';
import { createOrUpdateUser, sql } from '$lib/server/db';
import { listMcpOrganizationalUnits } from '$lib/server/mcp/organizationalUnits';

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

async function createOrganizationalUnit(
	connection: Fixtures['connection'],
	{
		creator,
		name,
		organization,
		slug,
		unitVisibility = visibility.enum.organization
	}: {
		creator?: string;
		name: string;
		organization: string;
		slug?: string;
		unitVisibility?: Visibility;
	}
) {
	const { guid, revision } = await connection.one(sql.type(
		z.object({ guid: z.uuid(), revision: z.number().int().positive() })
	)`
		INSERT INTO container (managed_by, organization, organizational_unit, payload, realm)
		VALUES (
			${organization},
			${organization},
			NULL,
			${sql.jsonb(
				organizationalUnitPayload.parse({
					name,
					slug,
					type: payloadTypes.enum.organizational_unit,
					visibility: unitVisibility
				})
			)},
			${realm}
		)
		RETURNING *
	`);

	if (creator) {
		await connection.query(sql.typeAlias('void')`
			INSERT INTO container_user (object, predicate, subject)
			VALUES (${revision}, ${predicates.enum['is-creator-of']}, ${creator})
		`);
	}

	return guid;
}

test('lists only visible organizational units and paginates after authorization', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const otherUser = await createTestUser(connection);
	const organization = await createOrganization(connection, member);
	const otherOrganization = await createOrganization(connection, otherUser);
	const alpha = await createOrganizationalUnit(connection, {
		name: 'Alpha visible unit',
		organization,
		slug: 'alpha-visible-unit'
	});
	await createOrganizationalUnit(connection, {
		creator: otherUser,
		name: 'Bravo hidden unit',
		organization,
		unitVisibility: visibility.enum.creator
	});
	const charlie = await createOrganizationalUnit(connection, {
		name: 'Charlie visible unit',
		organization
	});
	await createOrganizationalUnit(connection, {
		name: 'Other organization unit',
		organization: otherOrganization
	});

	await expect(
		listMcpOrganizationalUnits({
			limit: 1,
			offset: 0,
			organizationGuid: organization,
			userId: member
		})(connection)
	).resolves.toEqual({
		nextOffset: 1,
		organizationalUnits: [
			{
				guid: alpha,
				level: 1,
				name: 'Alpha visible unit',
				organizationGuid: organization,
				slug: 'alpha-visible-unit'
			}
		]
	});

	await expect(
		listMcpOrganizationalUnits({
			limit: 1,
			offset: 1,
			organizationGuid: organization,
			userId: member
		})(connection)
	).resolves.toEqual({
		nextOffset: null,
		organizationalUnits: [
			{
				guid: charlie,
				level: 1,
				name: 'Charlie visible unit',
				organizationGuid: organization,
				slug: null
			}
		]
	});
});
