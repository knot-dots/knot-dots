import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { type Fixtures, test } from '$lib/fixtures';
import { type AnyPayload, newContainer, payloadTypes, predicates } from '$lib/models';
import { computeUserGrants, computeUserGrantsFromRoles } from '$lib/server/computeUserGrants';
import {
	createContainer,
	createOrUpdateUser,
	getContainerByGuid,
	setContainerGrants
} from '$lib/server/db';
import { withFeatures } from '$lib/server/features';
import { withRequestUser } from '$lib/server/requestUser';

const realm = 'test';

function newTestContainer(
	organization: string,
	type: AnyPayload['type'],
	options: {
		inheritsGrants?: boolean;
		organizationalUnit?: string;
		relation?: { object: string; predicate: string }[];
		user?: { predicate: string; subject: string }[];
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
		user: options.user ?? []
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
		area_sourced: true,
		member: true,
		organization_manager: false,
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
		area_sourced: true,
		member: false,
		organization_manager: false,
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
		area_sourced: false,
		member: true,
		organization_manager: false,
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
		area_sourced: false,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update'],
		source: program.guid,
		subordinates: ['read', 'update']
	});
	expect(grants.get(program.guid)).toEqual({
		admin: false,
		area_sourced: false,
		member: true,
		organization_manager: false,
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
		area_sourced: true,
		member: true,
		organization_manager: false,
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
		area_sourced: false,
		member: true,
		organization_manager: true,
		own: [],
		self: ['read', 'update', 'delete', 'manage-users'],
		source: measure.guid,
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	});
});

test('the read paths enrich containers with the grants of the request user', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const measure = await createContainer(newTestContainer(organization, payloadTypes.enum.measure))(
		connection
	);
	await setContainerGrants(organization, subject, { self: [], subordinates: ['read', 'update'] })(
		connection
	);

	// the permission matrix flag governs which derivation the read paths use;
	// it is deployment-governed, so the test provides pod annotations
	const annotationsPath = path.join(
		fs.mkdtempSync(path.join(os.tmpdir(), 'podinfo-')),
		'annotations'
	);
	const previousPath = process.env.PODINFO_ANNOTATIONS_PATH;
	process.env.PODINFO_ANNOTATIONS_PATH = annotationsPath;
	const read = async () => {
		let result: Awaited<ReturnType<ReturnType<typeof getContainerByGuid>>> | undefined;
		await withFeatures({
			event: { locals: {} } as never,
			resolve: () =>
				withRequestUser({
					event: { locals: { user: { guid: subject, isAuthenticated: true } } } as never,
					resolve: async () => {
						result = await getContainerByGuid(measure.guid)(connection);
						return new Response();
					}
				})
		});
		return result;
	};

	fs.writeFileSync(annotationsPath, 'knotdots.net/PermissionMatrix="true"\n');
	const loaded = await read();
	if (previousPath === undefined) {
		delete process.env.PODINFO_ANNOTATIONS_PATH;
	} else {
		process.env.PODINFO_ANNOTATIONS_PATH = previousPath;
	}

	expect(loaded!.grant).toEqual({
		admin: false,
		area_sourced: true,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update'],
		source: organization,
		subordinates: ['read', 'update']
	});

	// outside a request the enrichment stands down
	const outside = await getContainerByGuid(measure.guid)(connection);
	expect(outside.grant).toBeUndefined();
});

test('member roles govern while the permission matrix is off', async ({ connection }: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, {
			user: [
				{ predicate: predicates.enum['is-head-of'], subject },
				{ predicate: predicates.enum['is-member-of'], subject }
			]
		})
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	// stored grant rows play no part while the roles govern
	await setContainerGrants(organization, subject, { self: [], subordinates: ['delete'] })(
		connection
	);

	const fromRoles = await computeUserGrantsFromRoles(connection, subject, [measure.guid]);

	expect(fromRoles.get(measure.guid)).toEqual({
		admin: false,
		area_sourced: false,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update', 'delete', 'manage-users'],
		source: program.guid,
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	});

	// the grant-based derivation ignores the roles and reads the stored rows
	const fromGrants = await computeUserGrants(connection, subject, [measure.guid]);
	expect(fromGrants.get(measure.guid)?.self).toEqual(['delete']);
});

test('rows on an organizational unit act as soon as they exist', async ({
	connection
}: Fixtures) => {
	// units are areas: unlike programs and measures, their rows need no
	// decoupling to override the organization — the units-override of old
	const organization = uuid();
	const subject = await newTestUser(connection);
	const unit = await createContainer(
		newTestContainer(organization, payloadTypes.enum.organizational_unit)
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { organizationalUnit: unit.guid })
	)(connection);
	await setContainerGrants(unit.guid, subject, {
		self: ['read', 'update', 'manage-users'],
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [unit.guid, measure.guid]);

	// the unit administers itself through its own rows
	expect(grants.get(unit.guid)?.own).toEqual(['read', 'update', 'manage-users']);
	expect(grants.get(unit.guid)?.admin).toBe(true);
	// and governs its contents
	expect(grants.get(measure.guid)?.source).toBe(unit.guid);
	expect(grants.get(measure.guid)?.self).toEqual(['read', 'update', 'delete', 'manage-users']);
});
