import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { type ContainerFixtures, type Fixtures, realm, test } from '$lib/fixtures';
import {
	grantForNewContainer,
	modifiedContainer,
	organizationalUnitType,
	payloadTypes,
	predicates
} from '$lib/models';
import { computeUserGrants, computeUserGrantsFromRoles } from '$lib/server/computeUserGrants';
import {
	createOrUpdateUser,
	deleteContainer,
	getAllGrantsOfUser,
	getContainerByGuid,
	setContainerGrants,
	updateContainer
} from '$lib/server/db';
import { withFeatures } from '$lib/server/features';
import { withRequestUser } from '$lib/server/requestUser';

async function newTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

test('contents inherit from the organization by default', async ({
	connection,
	containers,
	organization
}) => {
	const subject = await newTestUser(connection);
	const measure = containers.add({ type: payloadTypes.enum.measure });
	await containers.persist();
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

test('rows on an inheriting container lie dormant', async ({
	connection,
	containers,
	organization
}) => {
	const subject = await newTestUser(connection);
	const measure = containers.add({ type: payloadTypes.enum.measure });
	await containers.persist();
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
	connection,
	containers,
	organization
}) => {
	const subject = await newTestUser(connection);
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	await containers.persist();
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
		subordinates: ['delete'],
		dormant: organization
	});
});

test('contents inherit from the nearest decoupled ancestor', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const subject = await newTestUser(connection);
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
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
		subordinates: ['read', 'update'],
		dormant: organization
	});
});

test('a decoupled organizational unit cuts the organization off its contents', async ({
	connection,
	containers,
	organization
}) => {
	const subject = await newTestUser(connection);
	const unit = containers.add(
		{ type: payloadTypes.enum.organizational_unit },
		{ own_matrix: true }
	);
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: unit.guid }
	);
	await containers.persist();
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
	connection,
	containers,
	organization
}) => {
	const subject = await newTestUser(connection);
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	await containers.persist();
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
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users'],
		dormant: organization
	});
});

test('the read paths enrich containers with the grants of the request user', async ({
	connection,
	containers,
	organization
}) => {
	const subject = await newTestUser(connection);
	const measure = containers.add({ type: payloadTypes.enum.measure });
	await containers.persist();
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

test('member roles govern while the permission matrix is off', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const subject = await newTestUser(connection);
	const program = containers.add(
		{ type: payloadTypes.enum.program },
		{
			user: [
				{ predicate: predicates.enum['is-head-of'], subject },
				{ predicate: predicates.enum['is-member-of'], subject }
			]
		}
	);
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
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

test('rows on an inheriting organizational unit lie dormant', async ({
	connection,
	containers,
	organization
}) => {
	// units follow the same inheritance flag as programs and measures: their
	// rows rest until the unit decouples its matrix
	const subject = await newTestUser(connection);
	const unit = containers.add({ type: payloadTypes.enum.organizational_unit });
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: unit.guid }
	);
	await containers.persist();
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

test('two decoupled programs act side by side', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const subject = await newTestUser(connection);
	const programA = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const programB = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], programA);
	relations.add(measure, predicates.enum['is-part-of-program'], programB);
	await containers.persist();
	await relations.persist();
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
	connection,
	containers,
	organization,
	relations
}) => {
	const subject = await newTestUser(connection);
	const programA = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const programB = containers.add({ type: payloadTypes.enum.program });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], programA);
	relations.add(measure, predicates.enum['is-part-of-program'], programB);
	await containers.persist();
	await relations.persist();
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
	connection,
	containers,
	relations
}) => {
	// a program defining its own rights replaces the inherited ones, whether
	// they come from the organization or from the organizational unit
	const subject = await newTestUser(connection);
	const unit = containers.add(
		{ type: payloadTypes.enum.organizational_unit },
		{ own_matrix: true }
	);
	const program = containers.add(
		{ type: payloadTypes.enum.program },
		{ organizational_unit: unit.guid, own_matrix: true }
	);
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: unit.guid }
	);
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
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
	connection,
	containers,
	relations
}) => {
	const subject = await newTestUser(connection);
	const grandparent = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const parent = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(parent, predicates.enum['is-part-of'], grandparent);
	relations.add(measure, predicates.enum['is-part-of-program'], parent);
	await containers.persist();
	await relations.persist();
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
	connection,
	containers,
	relations
}) => {
	const subject = await newTestUser(connection);
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const chapter = containers.add({ type: payloadTypes.enum.goal });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(chapter, predicates.enum['is-part-of-program'], program);
	relations.add(measure, predicates.enum['is-part-of'], chapter);
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	await setContainerGrants(program.guid, subject, { self: [], subordinates: ['read'] })(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)?.sources).toEqual([program.guid]);
});

test('a full self set on one of several sources makes an administrator', async ({
	connection,
	containers,
	relations
}) => {
	const subject = await newTestUser(connection);
	const programA = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const programB = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], programA);
	relations.add(measure, predicates.enum['is-part-of-program'], programB);
	await containers.persist();
	await relations.persist();
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

function addDecoupledUnit(containers: ContainerFixtures) {
	return containers.add({ type: payloadTypes.enum.organizational_unit }, { own_matrix: true });
}

test('managed_by parity: program governed by the organization', async ({
	connection,
	containers,
	organization
}) => {
	const program = containers.add({ type: payloadTypes.enum.program });
	await containers.persist();
	expect(await sourcesOf(connection, program.guid)).toEqual([organization]);
});

test('managed_by parity: program governed by the organizational unit', async ({
	connection,
	containers
}) => {
	const unit = addDecoupledUnit(containers);
	const program = containers.add(
		{ type: payloadTypes.enum.program },
		{ organizational_unit: unit.guid }
	);
	await containers.persist();
	expect(await sourcesOf(connection, program.guid)).toEqual([unit.guid]);
});

test('managed_by parity: program governed by itself when it has a matrix', async ({
	connection,
	containers
}) => {
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	await containers.persist();
	expect(await sourcesOf(connection, program.guid)).toEqual([program.guid]);
});

test('managed_by parity: measure governed by its program when only the program has a matrix', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);
});

test('managed_by parity: measure governed by both matrices when program and measure have one', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	// nearest first: the measure's own matrix precedes the program's
	expect(await sourcesOf(connection, measure.guid)).toEqual([measure.guid, program.guid]);
});

test('managed_by parity: matrices accumulate across all levels, nearest first', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const goal = containers.add({ type: payloadTypes.enum.goal }, { own_matrix: true });
	const subgoal = containers.add({ type: payloadTypes.enum.goal }, { own_matrix: true });
	relations.add(goal, predicates.enum['is-part-of-program'], program);
	relations.add(subgoal, predicates.enum['is-part-of'], goal);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, subgoal.guid)).toEqual([
		subgoal.guid,
		goal.guid,
		program.guid
	]);
});

test('managed_by parity: decoupled ancestors reachable via several paths appear once', async ({
	connection,
	containers,
	relations
}) => {
	const firstProgram = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const secondProgram = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], firstProgram);
	relations.add(measure, predicates.enum['is-part-of-program'], secondProgram);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual(
		[firstProgram.guid, secondProgram.guid].toSorted()
	);
});

test('managed_by parity: a decoupled ancestor shared by two paths appears once', async ({
	connection,
	containers,
	relations
}) => {
	const root = containers.add({ type: payloadTypes.enum.goal }, { own_matrix: true });
	const firstBranch = containers.add({ type: payloadTypes.enum.goal });
	const secondBranch = containers.add({ type: payloadTypes.enum.goal });
	const leaf = containers.add({ type: payloadTypes.enum.goal });
	relations.add(firstBranch, predicates.enum['is-part-of'], root);
	relations.add(secondBranch, predicates.enum['is-part-of'], root);
	relations.add(leaf, predicates.enum['is-part-of'], firstBranch);
	relations.add(leaf, predicates.enum['is-part-of'], secondBranch);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, leaf.guid)).toEqual([root.guid]);
});

test('managed_by parity: measure keeps only its own matrix under an inheriting program', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program });
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual([measure.guid]);
});

test('managed_by parity: the organizational unit never accompanies a decoupled ancestor', async ({
	connection,
	containers,
	relations
}) => {
	const unit = addDecoupledUnit(containers);
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: unit.guid }
	);
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);
});

test('managed_by parity: measure governed by the organization when its program inherits', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual([organization]);
});

test('managed_by parity: measure falls back to the organization when its program inherits again', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);

	const persistedProgram = await getContainerByGuid(program.guid)(connection);
	await updateContainer(modifiedContainer.parse({ ...persistedProgram, own_matrix: false }))(
		connection
	);
	expect(await sourcesOf(connection, measure.guid)).toEqual([organization]);
});

test('managed_by parity: measure falls back to the organization when it is detached from its program', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);

	const persistedMeasure = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(modifiedContainer.parse({ ...persistedMeasure, relation: [] }))(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([organization]);
});

test('managed_by parity: measure falls back to the organization when its program is deleted', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual([program.guid]);

	const persistedProgram = await getContainerByGuid(program.guid)(connection);
	await deleteContainer(persistedProgram)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([organization]);
});

test('managed_by parity: the sources follow the container into another organizational unit', async ({
	connection,
	containers
}) => {
	const formerUnit = addDecoupledUnit(containers);
	const currentUnit = addDecoupledUnit(containers);
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: formerUnit.guid }
	);
	await containers.persist();
	expect(await sourcesOf(connection, measure.guid)).toEqual([formerUnit.guid]);

	const persistedMeasure = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(
		modifiedContainer.parse({ ...persistedMeasure, organizational_unit: currentUnit.guid })
	)(connection);
	expect(await sourcesOf(connection, measure.guid)).toEqual([currentUnit.guid]);
});

test('managed_by parity: goal governed by the program matrix two levels up', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ type: payloadTypes.enum.program }, { own_matrix: true });
	const goal = containers.add({ type: payloadTypes.enum.goal });
	const subgoal = containers.add({ type: payloadTypes.enum.goal });
	relations.add(goal, predicates.enum['is-part-of-program'], program);
	relations.add(subgoal, predicates.enum['is-part-of'], goal);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, subgoal.guid)).toEqual([program.guid]);
});

test('managed_by parity: cyclic relations do not prevent computation', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const goal = containers.add({ type: payloadTypes.enum.goal });
	const otherGoal = containers.add({ type: payloadTypes.enum.goal });
	relations.add(otherGoal, predicates.enum['is-part-of'], goal);
	relations.add(goal, predicates.enum['is-part-of'], otherGoal);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, goal.guid)).toEqual([organization]);
	expect(await sourcesOf(connection, otherGoal.guid)).toEqual([organization]);
});

test('managed_by parity: section governed by the matrix of its measure', async ({
	connection,
	containers,
	relations
}) => {
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	const section = containers.add({ type: payloadTypes.enum.text });
	relations.add(section, predicates.enum['is-section-of'], measure);
	await containers.persist();
	await relations.persist();
	expect(await sourcesOf(connection, section.guid)).toEqual([measure.guid]);
});

test('a decoupled container names the area it would fall back to', async ({
	connection,
	containers,
	organization
}) => {
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	await containers.persist();
	const subject = await newTestUser(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)?.sources).toEqual([measure.guid]);
	expect(grants.get(measure.guid)?.dormant).toBe(organization);
});

test('the area lies dormant only while a chain stays open', async ({
	connection,
	containers,
	relations
}) => {
	// a decoupled program on one chain, an inheriting program topping out on
	// the other: the organization applies while the measure inherits and lies
	// dormant once it decouples; a decoupled unit takes the organization's place
	const unit = addDecoupledUnit(containers);
	const decoupledProgram = containers.add(
		{ type: payloadTypes.enum.program },
		{ own_matrix: true }
	);
	const inheritingProgram = containers.add({ type: payloadTypes.enum.program });
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: unit.guid, own_matrix: true }
	);
	relations.add(measure, predicates.enum['is-part-of-program'], decoupledProgram);
	relations.add(measure, predicates.enum['is-part-of-program'], inheritingProgram);
	await containers.persist();
	await relations.persist();
	const subject = await newTestUser(connection);

	const decoupled = (await computeUserGrants(connection, subject, [measure.guid])).get(
		measure.guid
	);
	expect(decoupled?.sources).toEqual([measure.guid, decoupledProgram.guid]);
	expect(decoupled?.dormant).toBe(unit.guid);

	const persisted = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(modifiedContainer.parse({ ...persisted, own_matrix: false }))(connection);
	const inheriting = (await computeUserGrants(connection, subject, [measure.guid])).get(
		measure.guid
	);
	expect(inheriting?.sources).toEqual([decoupledProgram.guid, unit.guid]);
	expect(inheriting?.dormant).toBeUndefined();
});

// The units above a container's unit: a unit's matrix governs the contents
// of the units below it, so what governs a unit governs its contents too.
test('a decoupled unit governs the contents of the units below it', async ({
	connection,
	containers,
	relations
}) => {
	const subject = await newTestUser(connection);
	const unit = addDecoupledUnit(containers);
	const subunit = containers.add({ type: payloadTypes.enum.organizational_unit });
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: subunit.guid }
	);
	relations.add(subunit, predicates.enum['is-part-of'], unit);
	await containers.persist();
	await relations.persist();
	await setContainerGrants(unit.guid, subject, { self: [], subordinates: ['read', 'update'] })(
		connection
	);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		scope_sourced: true,
		member: true,
		organization_manager: false,
		own: [],
		self: ['read', 'update'],
		source: unit.guid,
		sources: [unit.guid],
		subordinates: ['read', 'update']
	});
});

test('the nearest unit above with a matrix governs the contents alone', async ({
	connection,
	containers,
	relations
}) => {
	const subject = await newTestUser(connection);
	const unit = addDecoupledUnit(containers);
	const subunit = addDecoupledUnit(containers);
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: subunit.guid }
	);
	relations.add(subunit, predicates.enum['is-part-of'], unit);
	await containers.persist();
	await relations.persist();
	await setContainerGrants(unit.guid, subject, { self: [], subordinates: ['update'] })(connection);
	await setContainerGrants(subunit.guid, subject, { self: [], subordinates: ['read'] })(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	// the unit above is cut off: units replace, they do not accumulate
	expect(grants.get(measure.guid)?.sources).toEqual([subunit.guid]);
	expect(grants.get(measure.guid)?.subordinates).toEqual(['read']);
	expect(grants.get(measure.guid)?.scope_sourced).toBe(true);
});

test('a decoupled unit below a decoupled unit is governed by its own matrix alone', async ({
	connection,
	containers,
	relations
}) => {
	const subject = await newTestUser(connection);
	const unit = addDecoupledUnit(containers);
	const subunit = addDecoupledUnit(containers);
	relations.add(subunit, predicates.enum['is-part-of'], unit);
	await containers.persist();
	await relations.persist();
	await setContainerGrants(unit.guid, subject, { self: ['read'], subordinates: ['update'] })(
		connection
	);
	await setContainerGrants(subunit.guid, subject, { self: ['read'], subordinates: ['read'] })(
		connection
	);

	const grants = await computeUserGrants(connection, subject, [subunit.guid]);

	expect(grants.get(subunit.guid)?.sources).toEqual([subunit.guid]);
	expect(grants.get(subunit.guid)?.subordinates).toEqual(['read']);
	// the unit above is the area the subunit falls back to once it inherits
	expect(grants.get(subunit.guid)?.dormant).toBe(unit.guid);
});

test('an inheriting unit follows the nearest unit above with a matrix', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const subject = await newTestUser(connection);
	const unit = addDecoupledUnit(containers);
	const middle = containers.add({ type: payloadTypes.enum.organizational_unit });
	const subunit = containers.add({ type: payloadTypes.enum.organizational_unit });
	relations.add(middle, predicates.enum['is-part-of'], unit);
	relations.add(subunit, predicates.enum['is-part-of'], middle);
	await containers.persist();
	await relations.persist();
	await setContainerGrants(unit.guid, subject, { self: [], subordinates: ['update'] })(connection);
	await setContainerGrants(organization, subject, { self: [], subordinates: ['delete'] })(
		connection
	);

	const grants = await computeUserGrants(connection, subject, [subunit.guid]);

	// the organization is cut off by the unit above
	expect(grants.get(subunit.guid)?.sources).toEqual([unit.guid]);
	expect(grants.get(subunit.guid)?.subordinates).toEqual(['update']);
	expect(grants.get(subunit.guid)?.dormant).toBeUndefined();
});

test('an inheriting unit without a unit above with a matrix follows the organization', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const subject = await newTestUser(connection);
	const unit = containers.add({ type: payloadTypes.enum.organizational_unit });
	const subunit = containers.add({ type: payloadTypes.enum.organizational_unit });
	relations.add(subunit, predicates.enum['is-part-of'], unit);
	await containers.persist();
	await relations.persist();
	await setContainerGrants(organization, subject, { self: [], subordinates: ['delete'] })(
		connection
	);

	const grants = await computeUserGrants(connection, subject, [subunit.guid]);

	expect(grants.get(subunit.guid)?.sources).toEqual([organization]);
	expect(grants.get(subunit.guid)?.subordinates).toEqual(['delete']);
});

test('administrators of a unit above administer the contents of the units below', async ({
	connection,
	containers,
	relations
}) => {
	const subject = await newTestUser(connection);
	const unit = addDecoupledUnit(containers);
	const subunit = addDecoupledUnit(containers);
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: subunit.guid, own_matrix: true }
	);
	relations.add(subunit, predicates.enum['is-part-of'], unit);
	await containers.persist();
	await relations.persist();
	await setContainerGrants(unit.guid, subject, {
		self: ['read', 'update', 'manage-users'],
		subordinates: ['read', 'update', 'create', 'delete', 'manage-users']
	})(connection);

	const grants = await computeUserGrants(connection, subject, [measure.guid]);

	expect(grants.get(measure.guid)?.admin).toBe(true);
	expect(grants.get(measure.guid)?.sources).toEqual([measure.guid]);
	expect(grants.get(measure.guid)?.dormant).toBe(subunit.guid);
});

test('creating within a unit is judged by what governs its contents', async ({
	connection,
	containers,
	relations
}) => {
	// the stub of a new container takes the grants of its unit, which must be
	// the ones its contents are governed by — Niels' finding on nested units
	const subject = await newTestUser(connection);
	const unit = addDecoupledUnit(containers);
	const subunit = containers.add({ type: payloadTypes.enum.organizational_unit });
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: subunit.guid }
	);
	relations.add(subunit, predicates.enum['is-part-of'], unit);
	await containers.persist();
	await relations.persist();
	await setContainerGrants(unit.guid, subject, {
		self: [],
		subordinates: ['read', 'update', 'create']
	})(connection);

	const subunitGrant = (await computeUserGrants(connection, subject, [subunit.guid])).get(
		subunit.guid
	);
	const stub = grantForNewContainer({
		...(await getContainerByGuid(subunit.guid)(connection)),
		user_grant: subunitGrant
	});
	const created = (await computeUserGrants(connection, subject, [measure.guid])).get(measure.guid);

	expect(stub?.subordinates).toEqual(['read', 'update', 'create']);
	expect(created?.subordinates).toEqual(stub?.subordinates);
	expect(created?.self).toEqual(stub?.self);
});

// A team is a unit marked as such; it holds rows like a user does and the
// subjects on its own matrix hold whatever the team holds.
function addTeam(containers: ContainerFixtures, members: string[]) {
	return containers.add(
		{
			organizationalUnitType: organizationalUnitType.enum['organizational_unit_type.team'],
			type: payloadTypes.enum.organizational_unit
		},
		{ user: members.map((subject) => ({ predicate: predicates.enum['is-member-of'], subject })) }
	);
}

test('members hold the rows of their team', async ({ connection, containers, organization }) => {
	const member = await newTestUser(connection);
	const other = await newTestUser(connection);
	const team = addTeam(containers, [member]);
	const measure = containers.add({ type: payloadTypes.enum.measure });
	await containers.persist();
	await setContainerGrants(organization, team.guid, {
		self: [],
		subordinates: ['read', 'update', 'create']
	})(connection);

	const grants = await computeUserGrants(connection, member, [measure.guid]);
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

	const otherGrants = await computeUserGrants(connection, other, [measure.guid]);
	expect(otherGrants.get(measure.guid)?.subordinates).toEqual([]);
});

test('a team row on a decoupled container acts for its members', async ({
	connection,
	containers,
	organization
}) => {
	const member = await newTestUser(connection);
	const team = addTeam(containers, [member]);
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	await containers.persist();
	await setContainerGrants(measure.guid, team.guid, {
		self: ['read', 'update'],
		subordinates: ['read']
	})(connection);

	const grants = await computeUserGrants(connection, member, [measure.guid]);
	expect(grants.get(measure.guid)).toEqual({
		admin: false,
		scope_sourced: false,
		member: true,
		organization_manager: false,
		own: ['read', 'update'],
		self: ['read'],
		source: measure.guid,
		sources: [measure.guid],
		subordinates: ['read'],
		dormant: organization
	});
});

test('rows held directly and through a team add up', async ({
	connection,
	containers,
	organization
}) => {
	const member = await newTestUser(connection);
	const team = addTeam(containers, [member]);
	const measure = containers.add({ type: payloadTypes.enum.measure });
	await containers.persist();
	await setContainerGrants(organization, member, { self: [], subordinates: ['read'] })(connection);
	await setContainerGrants(organization, team.guid, {
		self: [],
		subordinates: ['read', 'update']
	})(connection);

	const grants = await computeUserGrants(connection, member, [measure.guid]);
	expect(grants.get(measure.guid)?.subordinates).toEqual(['read', 'update']);
	expect(grants.get(measure.guid)?.self).toEqual(['read', 'update']);
});

test('the rows of a deleted team no longer reach its members', async ({
	connection,
	containers,
	organization
}) => {
	const member = await newTestUser(connection);
	const team = addTeam(containers, [member]);
	const measure = containers.add({ type: payloadTypes.enum.measure });
	await containers.persist();
	await setContainerGrants(organization, team.guid, { self: [], subordinates: ['read'] })(
		connection
	);
	await deleteContainer(await getContainerByGuid(team.guid)(connection))(connection);

	const grants = await computeUserGrants(connection, member, [measure.guid]);
	expect(grants.get(measure.guid)?.subordinates).toEqual([]);
	expect(await getAllGrantsOfUser(member)(connection)).toEqual([]);
});

test('the session carries the rows of the teams of a user', async ({
	connection,
	containers,
	organization
}) => {
	const member = await newTestUser(connection);
	const team = addTeam(containers, [member]);
	await containers.persist();
	await setContainerGrants(organization, member, { self: [], subordinates: ['read'] })(connection);
	await setContainerGrants(organization, team.guid, { self: [], subordinates: ['read', 'update'] })(
		connection
	);

	const grants = await getAllGrantsOfUser(member)(connection);
	expect(
		grants
			.filter(({ object }) => object === organization)
			.map(({ kind, subject }) => `${subject}:${kind}`)
			.sort()
	).toEqual([`${member}:read`, `${team.guid}:read`, `${team.guid}:update`].sort());
});
