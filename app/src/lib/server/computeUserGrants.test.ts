import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { type Fixtures, test } from '$lib/fixtures';
import { type AnyPayload, newContainer, payloadTypes, predicates } from '$lib/models';
import { computeUserGrants } from '$lib/server/computeUserGrants';
import { createContainer, createOrUpdateUser, setContainerGrants } from '$lib/server/db';

const realm = 'test';

function newTestContainer(
	organization: string,
	type: AnyPayload['type'],
	options: {
		inheritsGrants?: boolean;
		organizationalUnit?: string;
		relation?: { object: string; predicate: string }[];
	} = {}
) {
	return newContainer.parse({
		managed_by: organization,
		organization,
		organizational_unit: options.organizationalUnit ?? null,
		payload: {
			...(type === payloadTypes.enum.organizational_unit
				? { name: 'Lorem ipsum' }
				: { title: 'Lorem ipsum' }),
			type,
			...(options.inheritsGrants === undefined ? {} : { inheritsGrants: options.inheritsGrants })
		},
		realm,
		relation: options.relation?.map((r, position) => ({ ...r, position })) ?? [],
		user: []
	});
}

async function newTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

test('contents inherit from the organization by default', async ({ connection }: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const measure = await createContainer(newTestContainer(organization, payloadTypes.enum.measure))(
		connection
	);
	await setContainerGrants(organization, subject, {
		self: [],
		subordinates: ['read', 'update', 'create']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		member: false,
		own: [],
		self: ['read', 'update'],
		source: organization,
		subordinates: ['read', 'update', 'create']
	});
});

test('rows on an inheriting container lie dormant', async ({ connection }: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const measure = await createContainer(newTestContainer(organization, payloadTypes.enum.measure))(
		connection
	);
	await setContainerGrants(measure.guid, subject, {
		self: ['read', 'update'],
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		member: false,
		own: [],
		self: [],
		source: organization,
		subordinates: []
	});
});

test('a decoupled container is governed by its own matrix alone', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { inheritsGrants: false })
	)(connection);
	await setContainerGrants(measure.guid, subject, {
		self: ['read', 'update'],
		subordinates: ['delete']
	})(connection);
	// rows on the organization no longer reach the decoupled container
	await setContainerGrants(organization, subject, {
		self: [],
		subordinates: ['manage-users']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		member: true,
		own: ['read', 'update'],
		self: ['delete'],
		source: measure.guid,
		subordinates: ['delete']
	});
});

test('contents inherit from the nearest decoupled ancestor', async ({ connection }: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { inheritsGrants: false })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	await setContainerGrants(program.guid, subject, {
		self: ['read'],
		subordinates: ['read', 'update']
	})(connection);
	// the organization's rows are overridden by the decoupled program
	await setContainerGrants(organization, subject, {
		self: [],
		subordinates: ['read', 'update', 'create', 'delete']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid, program.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		member: true,
		own: [],
		self: ['read', 'update'],
		source: program.guid,
		subordinates: ['read', 'update']
	});
	expect(grants.get(program.guid)).toEqual({
		admin: false,
		member: true,
		own: ['read'],
		self: ['read', 'update'],
		source: program.guid,
		subordinates: ['read', 'update']
	});
});

test('a decoupled organizational unit cuts the organization off its contents', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const unit = await createContainer(
		newTestContainer(organization, payloadTypes.enum.organizational_unit, {
			inheritsGrants: false
		})
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { organizationalUnit: unit.guid })
	)(connection);
	await setContainerGrants(unit.guid, subject, { self: [], subordinates: ['read'] })(connection);
	await setContainerGrants(organization, subject, {
		self: [],
		subordinates: ['read', 'update', 'delete']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		member: false,
		own: [],
		self: ['read'],
		source: unit.guid,
		subordinates: ['read']
	});
});

test('organization administrators keep every kind regardless of decoupling', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { inheritsGrants: false })
	)(connection);
	await setContainerGrants(organization, subject, {
		self: ['read', 'update', 'manage-users'],
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: true,
		member: true,
		own: [],
		self: ['read', 'update', 'delete', 'manage-users'],
		source: measure.guid,
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	});
});
