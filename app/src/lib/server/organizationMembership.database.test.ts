import { expect } from 'vitest';
import { v4 as uuid } from 'uuid';
import { type Fixtures, test } from '$lib/fixtures';
import { payloadTypes, predicates, type Predicate } from '$lib/models';
import { createOrUpdateUser, getOrganizationMemberships, sql } from '$lib/server/db';

const realm = 'test';

async function createTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

async function createMembershipContainer(
	connection: Fixtures['connection'],
	{
		deleted = false,
		member,
		name,
		predicates: relationPredicates,
		slug,
		type = payloadTypes.enum.organization,
		validCurrently = true
	}: {
		deleted?: boolean;
		member: string;
		name: string;
		predicates: Predicate[];
		slug?: string;
		type?: typeof payloadTypes.enum.organization | typeof payloadTypes.enum.organizational_unit;
		validCurrently?: boolean;
	}
) {
	const guid = uuid();
	const { revision } = await connection.one(sql.typeAlias('revision')`
		INSERT INTO container (deleted, guid, managed_by, organization, payload, realm, valid_currently)
		VALUES (
			${deleted},
			${guid},
			${guid},
			${guid},
			${sql.jsonb({ name, slug, type })},
			${realm},
			${validCurrently}
		)
		RETURNING revision
	`);

	await connection.query(sql.typeAlias('void')`
		INSERT INTO container_user (object, predicate, subject)
		SELECT *
		FROM ${sql.unnest(
			relationPredicates.map((predicate) => [revision, predicate, member]),
			['int4', 'text', 'uuid']
		)}
	`);

	return guid;
}

test('organization membership query lists only active memberships with the highest role', async ({
	connection
}: Fixtures) => {
	const owner = await createTestUser(connection);
	const otherUser = await createTestUser(connection);
	const emptyUser = await createTestUser(connection);
	const adminOrganization = await createMembershipContainer(connection, {
		member: owner,
		name: 'Alpha administration',
		predicates: [
			predicates.enum['is-member-of'],
			predicates.enum['is-collaborator-of'],
			predicates.enum['is-admin-of']
		],
		slug: 'alpha'
	});
	const observerOrganization = await createMembershipContainer(connection, {
		member: owner,
		name: 'Zeta community',
		predicates: [predicates.enum['is-member-of']]
	});

	await createMembershipContainer(connection, {
		member: otherUser,
		name: 'Other user organization',
		predicates: [predicates.enum['is-member-of']]
	});
	await createMembershipContainer(connection, {
		member: owner,
		name: 'Role without membership',
		predicates: [predicates.enum['is-admin-of']]
	});
	await createMembershipContainer(connection, {
		member: owner,
		name: 'Organizational unit',
		predicates: [predicates.enum['is-member-of']],
		type: payloadTypes.enum.organizational_unit
	});
	await createMembershipContainer(connection, {
		deleted: true,
		member: owner,
		name: 'Deleted organization',
		predicates: [predicates.enum['is-member-of']]
	});
	await createMembershipContainer(connection, {
		member: owner,
		name: 'Stale organization revision',
		predicates: [predicates.enum['is-member-of']],
		validCurrently: false
	});

	await expect(getOrganizationMemberships(owner)(connection)).resolves.toEqual([
		{
			guid: adminOrganization,
			name: 'Alpha administration',
			role: 'administrator',
			slug: 'alpha'
		},
		{
			guid: observerOrganization,
			name: 'Zeta community',
			role: 'observer',
			slug: null
		}
	]);
	await expect(getOrganizationMemberships(emptyUser)(connection)).resolves.toEqual([]);
});
