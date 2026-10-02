import { expect, test } from 'vitest';
import {
	composeUserGrants,
	emptyGrantRecords,
	grantRecordsForRoleOn,
	grantSetForRole,
	memberRoles,
	anyContainer,
	type AnyPayload,
	type Container
} from '$lib/models';
import { authorizeContainerRelationChanges } from '$lib/server/containerRelations';
import type { User } from '$lib/stores';

const containerGuid = '00000000-0000-4000-8000-000000000001';
const otherGuid = '00000000-0000-4000-8000-000000000002';
const team = '00000000-0000-4000-8000-000000000004';
const otherTeam = '00000000-0000-4000-8000-000000000005';
const collaboratorSet = grantSetForRole(memberRoles.enum.collaborator);

const collaborator: User = {
	familyName: 'Collaborator',
	givenName: 'Test',
	grants: grantRecordsForRoleOn(memberRoles.enum.collaborator, team),
	guid: '00000000-0000-4000-8000-000000000003',
	isAuthenticated: true,
	roles: [],
	settings: {}
};
const sysadmin: User = { ...collaborator, grants: emptyGrantRecords(), roles: ['sysadmin'] };

// Containers arrive enriched with the request user's grants: the
// collaborator may update what `team` manages and read public containers.
function container(guid: string, managedBy: string, payload: Record<string, unknown>) {
	return anyContainer.parse({
		guid,
		managed_by: [managedBy],
		organization: otherTeam,
		organizational_unit: null,
		payload: { visibility: 'public', ...payload },
		realm: 'test',
		relation: [],
		revision: 1,
		user: [],
		user_grant: composeUserGrants({
			scopeSourced: false,
			governsItself: false,
			organizationSelf: [],
			organizationalUnitSelf: [],
			source: managedBy,
			sourceSelf: managedBy === team ? collaboratorSet.self : [],
			sourceSubordinates: managedBy === team ? collaboratorSet.subordinates : []
		}),
		valid_currently: true,
		valid_from: new Date('2026-09-28T00:00:00.000Z')
	});
}

const goal = (guid: string, managedBy: string) =>
	container(guid, managedBy, { title: 'Goal', type: 'goal' });

function change(overrides: Partial<{ deleted: boolean; object: string; predicate: string }> = {}) {
	return {
		deleted: false,
		object: otherGuid,
		position: 0,
		predicate: 'contributes-to',
		subject: containerGuid,
		...overrides
	};
}

function authorize(
	changes: ReturnType<typeof change>[],
	containers: Container<AnyPayload>[],
	{ features = [] as string[], user = collaborator } = {}
) {
	return authorizeContainerRelationChanges({
		changes,
		containers,
		features,
		guid: containerGuid,
		user
	});
}

test('authorizes changes through an updatable container to a readable one', () => {
	const changes = [change(), change({ deleted: true, predicate: 'is-consistent-with' })];

	expect(authorize(changes, [goal(containerGuid, team), goal(otherGuid, otherTeam)])).toEqual({
		authorized: changes,
		rejected: []
	});
});

test('authorizes changes in which the container is the object', () => {
	const incoming = { ...change(), object: containerGuid, subject: otherGuid };

	expect(
		authorize([incoming], [goal(containerGuid, team), goal(otherGuid, otherTeam)]).authorized
	).toEqual([incoming]);
});

test('rejects changes if only the other container is updatable', () => {
	const changes = [change()];

	expect(authorize(changes, [goal(containerGuid, otherTeam), goal(otherGuid, team)])).toEqual({
		authorized: [],
		rejected: changes
	});
});

test('rejects changes that do not involve the container', () => {
	const unrelated = {
		...change(),
		object: otherGuid,
		subject: '00000000-0000-4000-8000-000000000006'
	};

	expect(
		authorize([unrelated], [goal(containerGuid, team), goal(otherGuid, team)], { user: sysadmin })
			.rejected
	).toEqual([unrelated]);
});

test('rejects changes whose other container is not available', () => {
	expect(authorize([change()], [goal(containerGuid, team)]).rejected).toHaveLength(1);
});

const adoptableProgram = () =>
	container(containerGuid, otherTeam, {
		programType: 'program_type.set_of_rules',
		title: 'Rules',
		type: 'program'
	});
const organizationalUnit = (guid = otherGuid) =>
	container(guid, guid, { level: 1, name: 'Unit', type: 'organizational_unit' });
const adoption = (overrides: Partial<{ deleted: boolean }> = {}) =>
	change({ predicate: 'is-adopted-by', ...overrides });

test('authorizes adopting an adoptable program when adoptions are enabled', () => {
	expect(
		authorize([adoption()], [adoptableProgram(), organizationalUnit()], {
			features: ['Adoptions'],
			user: sysadmin
		}).authorized
	).toHaveLength(1);
});

test('rejects adoptions while the feature is disabled', () => {
	expect(
		authorize([adoption()], [adoptableProgram(), organizationalUnit()], { user: sysadmin }).rejected
	).toHaveLength(1);
});

test('rejects adopting a program that is not adoptable, but allows removing the adoption', () => {
	const program = container(containerGuid, otherTeam, { title: 'Plan', type: 'program' });

	expect(
		authorize([adoption(), adoption({ deleted: true })], [program, organizationalUnit()], {
			features: ['Adoptions'],
			user: sysadmin
		})
	).toEqual({ authorized: [adoption({ deleted: true })], rejected: [adoption()] });
});

test('rejects an organizational unit adopting its own program', () => {
	const program = { ...adoptableProgram(), organizational_unit: otherGuid };

	expect(
		authorize([adoption()], [program, organizationalUnit()], {
			features: ['Adoptions'],
			user: sysadmin
		}).rejected
	).toHaveLength(1);
});

test('rejects adoptions made through the adopting unit', () => {
	const throughAdopter = { ...adoption(), object: containerGuid, subject: otherGuid };

	expect(
		authorize(
			[throughAdopter],
			[organizationalUnit(containerGuid), { ...adoptableProgram(), guid: otherGuid }],
			{ features: ['Adoptions'], user: sysadmin }
		).rejected
	).toHaveLength(1);
});

const organization = (guid = otherGuid) =>
	container(guid, guid, { name: 'Organization', type: 'organization' });

test('authorizes an organization adopting a program', () => {
	expect(
		authorize([adoption()], [adoptableProgram(), organization()], {
			features: ['Adoptions'],
			user: sysadmin
		}).authorized
	).toHaveLength(1);
});

test('rejects an organization adopting its own program', () => {
	const program = { ...adoptableProgram(), organization: otherGuid };

	expect(
		authorize([adoption()], [program, organization()], {
			features: ['Adoptions'],
			user: sysadmin
		}).rejected
	).toHaveLength(1);
});

test('requires the right to create within the adopting scope', () => {
	// the collaborator holds a create grant within what `team` manages only
	const unitWithinTeam = container(otherGuid, team, {
		level: 1,
		name: 'Unit',
		type: 'organizational_unit'
	});

	expect(
		authorize([adoption()], [adoptableProgram(), unitWithinTeam], { features: ['Adoptions'] })
			.authorized
	).toHaveLength(1);
	expect(
		authorize([adoption()], [adoptableProgram(), organizationalUnit()], {
			features: ['Adoptions']
		}).rejected
	).toHaveLength(1);
});
