import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { type Fixtures, test } from '$lib/fixtures';
import {
	type AnyPayload,
	modifiedContainer,
	newContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import { computeUserGrants, computeUserGrantsFromRoles } from '$lib/server/computeUserGrants';
import {
	createContainer,
	createOrUpdateUser,
	deleteContainer,
	getContainerByGuid,
	setContainerGrants,
	updateContainer
} from '$lib/server/db';
import { withFeatures } from '$lib/server/features';
import { withRequestUser } from '$lib/server/requestUser';

const realm = 'test';

function newTestContainer(
	organization: string,
	type: AnyPayload['type'],
	options: {
		ownMatrix?: boolean;
		organizationalUnit?: string;
		relation?: { object: string; predicate: string }[];
		user?: { predicate: string; subject: string }[];
	} = {}
) {
	return {
		...newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: options.organizationalUnit ?? null,
			payload: {
				...(type === payloadTypes.enum.organizational_unit
					? { name: 'Lorem ipsum' }
					: { title: 'Lorem ipsum' }),
				type
			},
			realm,
			relation: options.relation?.map((r, position) => ({ ...r, position })) ?? [],
			user: options.user ?? []
		}),
		own_matrix: options.ownMatrix ?? false
	};
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
		scope_sourced: true,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update'],
		source: organization,
		sources: [organization],
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
		scope_sourced: true,
		member: false,
		organization_manager: false,
		own: [],
		self: [],
		source: organization,
		sources: [organization],
		subordinates: []
	});
});

test('a decoupled container is governed by its own matrix alone', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { ownMatrix: true })
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
		scope_sourced: false,
		member: true,
		organization_manager: false,
		own: ['read', 'update'],
		self: ['delete'],
		source: measure.guid,
		sources: [measure.guid],
		subordinates: ['delete']
	});
});

test('contents inherit from the nearest decoupled ancestor', async ({ connection }: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
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
		scope_sourced: false,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update'],
		source: program.guid,
		sources: [program.guid],
		subordinates: ['read', 'update']
	});
	expect(grants.get(program.guid)).toEqual({
		admin: false,
		scope_sourced: false,
		member: true,
		organization_manager: false,
		own: ['read'],
		self: ['read', 'update'],
		source: program.guid,
		sources: [program.guid],
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
			ownMatrix: true
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
		scope_sourced: true,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read'],
		source: unit.guid,
		sources: [unit.guid],
		subordinates: ['read']
	});
});

test('organization administrators keep every kind regardless of decoupling', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { ownMatrix: true })
	)(connection);
	await setContainerGrants(organization, subject, {
		self: ['read', 'update', 'manage-users'],
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: true,
		scope_sourced: false,
		member: true,
		organization_manager: true,
		own: [],
		self: ['read', 'update', 'delete', 'manage-users'],
		source: measure.guid,
		sources: [measure.guid],
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

	expect(loaded!.user_grant).toEqual({
		admin: false,
		scope_sourced: true,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update'],
		source: organization,
		sources: [organization],
		subordinates: ['read', 'update']
	});

	// outside a request the enrichment stands down
	const outside = await getContainerByGuid(measure.guid)(connection);
	expect(outside.user_grant).toBeUndefined();
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
		scope_sourced: false,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update', 'delete', 'manage-users'],
		source: program.guid,
		sources: [program.guid],
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	});

	// the grant-based derivation ignores the roles and reads the stored rows
	const fromGrants = await computeUserGrants(connection, subject, [measure.guid]);
	expect(fromGrants.get(measure.guid)?.self).toEqual(['delete']);
});

test('rows on an inheriting organizational unit lie dormant', async ({ connection }: Fixtures) => {
	// units follow the same inheritance flag as programs and measures: their
	// rows rest until the unit decouples its matrix
	const organization = uuid();
	const subject = await newTestUser(connection);
	const unit = await createContainer(
		newTestContainer(organization, payloadTypes.enum.organizational_unit)
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { organizationalUnit: unit.guid })
	)(connection);
	await setContainerGrants(unit.guid, subject, {
		self: ['read', 'update'],
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [unit.guid, measure.guid]);

	// the unit and its contents stay with the organization's matrix
	expect(grants.get(unit.guid)?.source).toBe(organization);
	expect(grants.get(unit.guid)?.self).toEqual([]);
	expect(grants.get(measure.guid)?.source).toBe(organization);
	expect(grants.get(measure.guid)?.self).toEqual([]);
});

test('two decoupled programs act side by side', async ({ connection }: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const programA = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const programB = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [
				{ object: programA.guid, predicate: predicates.enum['is-part-of-program'] },
				{ object: programB.guid, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	await setContainerGrants(programA.guid, subject, {
		self: [],
		subordinates: ['read', 'update']
	})(connection);
	await setContainerGrants(programB.guid, subject, {
		self: [],
		subordinates: ['read', 'create']
	})(connection);
	// dormant: both chains end at the decoupled programs
	await setContainerGrants(organization, subject, {
		self: [],
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	const sources = [programA.guid, programB.guid].sort();
	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		scope_sourced: false,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update'],
		source: sources[0],
		sources,
		subordinates: ['read', 'update', 'create']
	});
});

test('a chain without a decoupled ancestor adds the organization', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const programA = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const programB = await createContainer(newTestContainer(organization, payloadTypes.enum.program))(
		connection
	);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [
				{ object: programA.guid, predicate: predicates.enum['is-part-of-program'] },
				{ object: programB.guid, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	await setContainerGrants(programA.guid, subject, {
		self: [],
		subordinates: ['update']
	})(connection);
	await setContainerGrants(organization, subject, { self: [], subordinates: ['read'] })(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		scope_sourced: false,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update'],
		source: programA.guid,
		sources: [programA.guid, organization],
		subordinates: ['read', 'update']
	});
});

test('a decoupled program cuts a decoupled organizational unit off its contents', async ({
	connection
}: Fixtures) => {
	// a program defining its own rights replaces the inherited ones, whether
	// they come from the organization or from the organizational unit
	const organization = uuid();
	const subject = await newTestUser(connection);
	const unit = await createContainer(
		newTestContainer(organization, payloadTypes.enum.organizational_unit, { ownMatrix: true })
	)(connection);
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, {
			ownMatrix: true,
			organizationalUnit: unit.guid
		})
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			organizationalUnit: unit.guid,
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	await setContainerGrants(program.guid, subject, {
		self: [],
		subordinates: ['update']
	})(connection);
	await setContainerGrants(unit.guid, subject, { self: [], subordinates: ['read'] })(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		scope_sourced: false,
		member: false,
		organization_manager: false,
		own: [],
		self: ['update'],
		source: program.guid,
		sources: [program.guid],
		subordinates: ['update']
	});
});

test('decoupled ancestors accumulate up the chain, nearest first', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const grandparent = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const parent = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, {
			ownMatrix: true,
			relation: [{ object: grandparent.guid, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [{ object: parent.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	await setContainerGrants(parent.guid, subject, { self: [], subordinates: ['read'] })(connection);
	await setContainerGrants(grandparent.guid, subject, {
		self: [],
		subordinates: ['read', 'update', 'create', 'delete']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)?.sources).toEqual([parent.guid, grandparent.guid]);
	expect(grants.get(measure.guid)?.subordinates).toEqual(['read', 'update', 'create', 'delete']);
});

test('paths meeting at the same decoupled ancestor yield one source', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const chapter = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [
				{ object: chapter.guid, predicate: predicates.enum['is-part-of'] },
				{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	await setContainerGrants(program.guid, subject, { self: [], subordinates: ['read'] })(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)?.sources).toEqual([program.guid]);
});

test('a full self set on one of several sources makes an administrator', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const subject = await newTestUser(connection);
	const programA = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const programB = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [
				{ object: programA.guid, predicate: predicates.enum['is-part-of-program'] },
				{ object: programB.guid, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	await setContainerGrants(programA.guid, subject, {
		self: ['read', 'update', 'manage-users'],
		subordinates: []
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)?.admin).toBe(true);
	expect(grants.get(measure.guid)?.subordinates).toEqual([
		'read',
		'update',
		'create',
		'delete',
		'manage-users'
	]);
});

// The scenarios of the computeManagedBy tests (db.test.ts), ported: a "team"
// there is a container with a matrix of its own here, and managed_by is the
// list of sources. The sources are the same for every subject, so a throwaway
// user serves as the subject throughout.
async function sourcesOf(connection: Fixtures['connection'], guid: string) {
	const subject = await newTestUser(connection);
	return (await computeUserGrants(connection, subject, [guid])).get(guid)?.sources;
}

async function newDecoupledUnit(connection: Fixtures['connection'], organization: string) {
	return createContainer(
		newTestContainer(organization, payloadTypes.enum.organizational_unit, { ownMatrix: true })
	)(connection);
}

test('managed_by parity: program governed by the organization', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(newTestContainer(organization, payloadTypes.enum.program))(
		connection
	);
	expect(await sourcesOf(connection, program.guid)).toEqual([organization]);
});

test('managed_by parity: program governed by the organizational unit', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const unit = await newDecoupledUnit(connection, organization);
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { organizationalUnit: unit.guid })
	)(connection);
	expect(await sourcesOf(connection, program.guid)).toEqual([unit.guid]);
});

test('managed_by parity: program governed by itself when it has a matrix', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	expect(await sourcesOf(connection, program.guid)).toEqual([program.guid]);
});

test('managed_by parity: measure governed by its program when only the program has a matrix', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);
});

test('managed_by parity: measure governed by both matrices when program and measure have one', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			ownMatrix: true,
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	// nearest first: the measure's own matrix precedes the program's
	expect(await sourcesOf(connection, measure.guid)).toEqual([measure.guid, program.guid]);
});

test('managed_by parity: matrices accumulate across all levels, nearest first', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const goal = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			ownMatrix: true,
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	const subgoal = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			ownMatrix: true,
			relation: [{ object: goal.guid, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, subgoal.guid)).toEqual([
		subgoal.guid,
		goal.guid,
		program.guid
	]);
});

test('managed_by parity: decoupled ancestors reachable via several paths appear once', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const firstProgram = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const secondProgram = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [
				{ object: firstProgram.guid, predicate: predicates.enum['is-part-of-program'] },
				{ object: secondProgram.guid, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual(
		[firstProgram.guid, secondProgram.guid].toSorted()
	);
});

test('managed_by parity: a decoupled ancestor shared by two paths appears once', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const root = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, { ownMatrix: true })
	)(connection);
	const firstBranch = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			relation: [{ object: root.guid, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	const secondBranch = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			relation: [{ object: root.guid, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	const leaf = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			relation: [
				{ object: firstBranch.guid, predicate: predicates.enum['is-part-of'] },
				{ object: secondBranch.guid, predicate: predicates.enum['is-part-of'] }
			]
		})
	)(connection);
	expect(await sourcesOf(connection, leaf.guid)).toEqual([root.guid]);
});

test('managed_by parity: measure keeps only its own matrix under an inheriting program', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(newTestContainer(organization, payloadTypes.enum.program))(
		connection
	);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			ownMatrix: true,
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([measure.guid]);
});

test('managed_by parity: the organizational unit never accompanies a decoupled ancestor', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const unit = await newDecoupledUnit(connection, organization);
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			organizationalUnit: unit.guid,
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);
});

test('managed_by parity: measure governed by the organization when its program inherits', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(newTestContainer(organization, payloadTypes.enum.program))(
		connection
	);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([organization]);
});

test('managed_by parity: measure falls back to the organization when its program inherits again', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);

	const persistedProgram = await getContainerByGuid(program.guid)(connection);
	await updateContainer(modifiedContainer.parse({ ...persistedProgram, own_matrix: false }))(
		connection
	);
	expect(await sourcesOf(connection, measure.guid)).toEqual([organization]);
});

test('managed_by parity: measure falls back to the organization when it is detached from its program', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);

	const persistedMeasure = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(modifiedContainer.parse({ ...persistedMeasure, relation: [] }))(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([organization]);
});

test('managed_by parity: measure falls back to the organization when its program is deleted', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);

	const persistedProgram = await getContainerByGuid(program.guid)(connection);
	await deleteContainer(persistedProgram)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([organization]);
});

test('managed_by parity: the sources follow the container into another organizational unit', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const formerUnit = await newDecoupledUnit(connection, organization);
	const currentUnit = await newDecoupledUnit(connection, organization);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, {
			organizationalUnit: formerUnit.guid
		})
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([formerUnit.guid]);

	const persistedMeasure = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(
		modifiedContainer.parse({ ...persistedMeasure, organizational_unit: currentUnit.guid })
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([currentUnit.guid]);
});

test('managed_by parity: goal governed by the program matrix two levels up', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const program = await createContainer(
		newTestContainer(organization, payloadTypes.enum.program, { ownMatrix: true })
	)(connection);
	const goal = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);
	const subgoal = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			relation: [{ object: goal.guid, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, subgoal.guid)).toEqual([program.guid]);
});

test('managed_by parity: cyclic relations do not prevent computation', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const goal = await createContainer(newTestContainer(organization, payloadTypes.enum.goal))(
		connection
	);
	const otherGoal = await createContainer(
		newTestContainer(organization, payloadTypes.enum.goal, {
			relation: [{ object: goal.guid, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	const persistedGoal = await getContainerByGuid(goal.guid)(connection);
	await updateContainer(
		modifiedContainer.parse({
			...persistedGoal,
			relation: [
				...persistedGoal.relation,
				{
					object: otherGoal.guid,
					position: 0,
					predicate: predicates.enum['is-part-of'],
					subject: goal.guid
				}
			]
		})
	)(connection);
	expect(await sourcesOf(connection, goal.guid)).toEqual([organization]);
	expect(await sourcesOf(connection, otherGoal.guid)).toEqual([organization]);
});

test('managed_by parity: section governed by the matrix of its measure', async ({
	connection
}: Fixtures) => {
	const organization = uuid();
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { ownMatrix: true })
	)(connection);
	const section = await createContainer(
		newTestContainer(organization, payloadTypes.enum.text, {
			relation: [{ object: measure.guid, predicate: predicates.enum['is-section-of'] }]
		})
	)(connection);
	expect(await sourcesOf(connection, section.guid)).toEqual([measure.guid]);
});
