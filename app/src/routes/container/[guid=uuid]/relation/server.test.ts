import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const deleteManyContainerRelations = vi.hoisted(() => vi.fn());
const getAllContainersRelatedToIndicators = vi.hoisted(() => vi.fn());
const getAllContainersRelatedToMeasure = vi.hoisted(() => vi.fn());
const getAllContainersRelatedToProgram = vi.hoisted(() => vi.fn());
const getAllRelatedContainers = vi.hoisted(() => vi.fn());
const getAllRelatedOrganizationalUnitContainers = vi.hoisted(() => vi.fn());
const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyContainers = vi.hoisted(() => vi.fn());
const getManyOrganizationContainers = vi.hoisted(() => vi.fn());
const updateManyContainerRelations = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({
	deleteManyContainerRelations,
	getAllContainersRelatedToIndicators,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationContainers,
	updateManyContainerRelations
}));

import { POST } from './+server';
import {
	composeUserGrants,
	emptyGrantRecords,
	grantRecordsForRoleOn,
	grantSetForRole,
	memberRoles
} from '$lib/models';

locale.set('en');

const containerGuid = '00000000-0000-4000-8000-000000000001';
const sourceGuid = '00000000-0000-4000-8000-000000000002';
const team = '00000000-0000-4000-8000-000000000004';
const otherTeam = '00000000-0000-4000-8000-000000000005';
const user = {
	familyName: 'Admin',
	givenName: 'Test',
	grants: emptyGrantRecords(),
	guid: '00000000-0000-4000-8000-000000000003',
	isAuthenticated: true,
	roles: ['sysadmin'],
	settings: {}
};

// the containers arrive enriched with the request user's grants: a
// collaborator of `team` in these tests
const collaboratorSet = grantSetForRole(memberRoles.enum.collaborator);

function measure(guid: string, managedBy: string) {
	return {
		guid,
		managed_by: [managedBy],
		organization: otherTeam,
		organizational_unit: null,
		payload: { title: 'Measure', type: 'measure', visibility: 'public' },
		relation: [],
		user: [],
		user_grant: composeUserGrants({
			scopeSourced: false,
			governsItself: false,
			organizationSelf: [],
			organizationalUnitSelf: [],
			source: managedBy,
			sourceSelf: managedBy === team ? collaboratorSet.self : [],
			sourceSubordinates: managedBy === team ? collaboratorSet.subordinates : []
		})
	};
}

function program(guid: string, managedBy: string) {
	return {
		...measure(guid, managedBy),
		payload: { title: 'Program', type: 'program', visibility: 'public' }
	};
}

const organization = '00000000-0000-4000-8000-000000000006';
const unit = '00000000-0000-4000-8000-000000000007';

// a public rule-set program of another organization, the route container
function ruleSet(guid: string) {
	return {
		...program(guid, otherTeam),
		organizational_unit: null,
		payload: {
			programType: 'program_type.set_of_rules',
			title: 'Rules',
			type: 'program',
			visibility: 'public'
		}
	};
}

// an organizational unit inheriting its grants from the organization, on
// which the user holds the given set — the same composition whether the
// permission matrix is on (stored rows) or off (rows the member roles stand for)
function inheritingUnit(organizationSet: { self: string[]; subordinates: string[] }) {
	return {
		guid: unit,
		managed_by: [organization],
		organization,
		organizational_unit: null,
		payload: { name: 'Unit', type: 'organizational_unit', visibility: 'public' },
		realm: 'test',
		relation: [],
		user: [],
		user_grant: composeUserGrants({
			scopeSourced: true,
			governsItself: false,
			organizationSelf: organizationSet.self as never,
			organizationalUnitSelf: [],
			source: organization,
			sourceSelf: organizationSet.self as never,
			sourceSubordinates: organizationSet.subordinates as never
		})
	};
}

// a decoupled organizational unit governed by its own rows, of which the user
// holds none; the organization set counts only through admin status
function decoupledUnit(organizationSet: { self: string[]; subordinates: string[] }) {
	return {
		...inheritingUnit(organizationSet),
		own_matrix: true,
		user_grant: composeUserGrants({
			scopeSourced: false,
			governsItself: true,
			organizationSelf: organizationSet.self as never,
			organizationalUnitSelf: [],
			source: unit,
			sourceSelf: [],
			sourceSubordinates: []
		})
	};
}

function adoption(deleted = false) {
	return [
		{ deleted, object: unit, position: 0, predicate: 'is-adopted-by', subject: containerGuid }
	];
}

function postRelation(
	currentUser: unknown,
	body: unknown[] = [
		{ object: containerGuid, position: 0, predicate: 'is-part-of', subject: sourceGuid }
	],
	features: string[] = []
) {
	const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' }
	});

	return POST({
		locals: {
			features,
			pool: { transaction: vi.fn().mockImplementation((callback) => callback({})) },
			user: currentUser
		},
		params: { guid: containerGuid },
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	updateManyContainerRelations.mockReturnValue(async () => undefined);
	deleteManyContainerRelations.mockReturnValue(async () => undefined);
});

test('the update permission on the route container authorizes a relation', async () => {
	getManyContainers.mockReturnValue(async () => [
		measure(containerGuid, team),
		measure(sourceGuid, otherTeam)
	]);

	const response = await postRelation({
		...user,
		roles: [],
		grants: grantRecordsForRoleOn(memberRoles.enum.collaborator, team)
	});

	expect(response.status).toBe(204);
	expect(updateManyContainerRelations).toHaveBeenCalledWith([
		{
			deleted: false,
			object: containerGuid,
			position: 0,
			predicate: 'is-part-of',
			subject: sourceGuid
		}
	]);
});

test('relations without the update permission on the route container are ignored', async () => {
	// the user may update the other side only — that does not suffice
	getManyContainers.mockReturnValue(async () => [
		measure(containerGuid, otherTeam),
		measure(sourceGuid, team)
	]);

	const response = await postRelation({
		...user,
		roles: [],
		grants: grantRecordsForRoleOn(memberRoles.enum.collaborator, team)
	});

	expect(response.status).toBe(204);
	expect(updateManyContainerRelations).not.toHaveBeenCalled();
	expect(deleteManyContainerRelations).not.toHaveBeenCalled();
});

test.each([
	['administrator', memberRoles.enum.administrator],
	['collaborator', memberRoles.enum.collaborator],
	['head', memberRoles.enum.head]
] as const)(
	'an organization %s adopts a program into a unit inheriting from the organization',
	async (_, role) => {
		getManyContainers.mockReturnValue(async () => [
			ruleSet(containerGuid),
			inheritingUnit(grantSetForRole(role))
		]);

		const response = await postRelation(
			{ ...user, roles: [], grants: grantRecordsForRoleOn(role, organization) },
			adoption(),
			['Adoptions']
		);

		expect(response.status).toBe(204);
		expect(updateManyContainerRelations).toHaveBeenCalledWith([
			{
				deleted: false,
				object: unit,
				position: 0,
				predicate: 'is-adopted-by',
				subject: containerGuid
			}
		]);
	}
);

test('an organization observer may not adopt: no create grant within the unit', async () => {
	getManyContainers.mockReturnValue(async () => [
		ruleSet(containerGuid),
		inheritingUnit(grantSetForRole(memberRoles.enum.observer))
	]);

	const response = await postRelation(
		{
			...user,
			roles: [],
			grants: grantRecordsForRoleOn(memberRoles.enum.observer, organization)
		},
		adoption(),
		['Adoptions']
	);

	expect(response.status).toBe(204);
	expect(updateManyContainerRelations).not.toHaveBeenCalled();
});

test('a decoupled unit cuts an organization collaborator off adopting', async () => {
	getManyContainers.mockReturnValue(async () => [
		ruleSet(containerGuid),
		decoupledUnit(grantSetForRole(memberRoles.enum.collaborator))
	]);

	const response = await postRelation(
		{
			...user,
			roles: [],
			grants: grantRecordsForRoleOn(memberRoles.enum.collaborator, organization)
		},
		adoption(),
		['Adoptions']
	);

	expect(response.status).toBe(204);
	expect(updateManyContainerRelations).not.toHaveBeenCalled();
});

test('an organization administrator adopts into a decoupled unit as well', async () => {
	getManyContainers.mockReturnValue(async () => [
		ruleSet(containerGuid),
		decoupledUnit(grantSetForRole(memberRoles.enum.administrator))
	]);

	const response = await postRelation(
		{
			...user,
			roles: [],
			grants: grantRecordsForRoleOn(memberRoles.enum.administrator, organization)
		},
		adoption(),
		['Adoptions']
	);

	expect(response.status).toBe(204);
	expect(updateManyContainerRelations).toHaveBeenCalledWith([
		{
			deleted: false,
			object: unit,
			position: 0,
			predicate: 'is-adopted-by',
			subject: containerGuid
		}
	]);
});

test('an adoption is removed by those who may create within the unit', async () => {
	getManyContainers.mockReturnValue(async () => [
		ruleSet(containerGuid),
		inheritingUnit(grantSetForRole(memberRoles.enum.collaborator))
	]);

	const response = await postRelation(
		{
			...user,
			roles: [],
			grants: grantRecordsForRoleOn(memberRoles.enum.collaborator, organization)
		},
		adoption(true),
		['Adoptions']
	);

	expect(response.status).toBe(204);
	expect(deleteManyContainerRelations).toHaveBeenCalledWith([
		{ deleted: true, object: unit, position: 0, predicate: 'is-adopted-by', subject: containerGuid }
	]);
	expect(updateManyContainerRelations).not.toHaveBeenCalled();
});

test('adoptions are ignored while the feature is off', async () => {
	getManyContainers.mockReturnValue(async () => [
		ruleSet(containerGuid),
		inheritingUnit(grantSetForRole(memberRoles.enum.administrator))
	]);

	const response = await postRelation(
		{
			...user,
			roles: [],
			grants: grantRecordsForRoleOn(memberRoles.enum.administrator, organization)
		},
		adoption()
	);

	expect(response.status).toBe(204);
	expect(updateManyContainerRelations).not.toHaveBeenCalled();
});

test.each(['is-copy-of', 'is-individual-profile-of'] as const)(
	'relation updates reject client-supplied %s provenance before writing',
	async (predicate) => {
		const transaction = vi.fn();
		const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
			method: 'POST',
			body: JSON.stringify([
				{ object: sourceGuid, position: 0, predicate, subject: containerGuid }
			]),
			headers: { 'Content-Type': 'application/json' }
		});

		await expect(
			POST({
				locals: { pool: { transaction }, user },
				params: { guid: containerGuid },
				request
			} as never)
		).rejects.toMatchObject({ status: 422 });
		expect(transaction).not.toHaveBeenCalled();
	}
);

test('relation updates reject direct availability changes before writing', async () => {
	const transaction = vi.fn();
	const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
		method: 'POST',
		body: JSON.stringify([
			{
				object: sourceGuid,
				position: 0,
				predicate: 'is-available-in',
				subject: containerGuid
			}
		]),
		headers: { 'Content-Type': 'application/json' }
	});

	await expect(
		POST({
			locals: { pool: { transaction }, user },
			params: { guid: containerGuid },
			request
		} as never)
	).rejects.toMatchObject({ status: 422 });
	expect(transaction).not.toHaveBeenCalled();
});

test.each([
	['is-part-of-program', () => program(sourceGuid, otherTeam)],
	['is-part-of-measure', () => measure(sourceGuid, otherTeam)]
] as const)(
	'relation updates accept an existing object with a new %s placement when templating is enabled',
	async (predicate, parent) => {
		getManyContainers.mockReturnValue(async () => [measure(containerGuid, team), parent()]);
		const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
			method: 'POST',
			body: JSON.stringify([
				{
					object: sourceGuid,
					position: 0,
					predicate,
					subject: containerGuid
				}
			]),
			headers: { 'Content-Type': 'application/json' }
		});

		const response = await POST({
			locals: {
				features: ['Templating'],
				pool: { transaction: vi.fn().mockImplementation((callback) => callback({})) },
				user
			},
			params: { guid: containerGuid },
			request
		} as never);

		expect(response.status).toBe(204);
		expect(updateManyContainerRelations).toHaveBeenCalledWith([
			{
				deleted: false,
				object: sourceGuid,
				position: 0,
				predicate,
				subject: containerGuid
			}
		]);
	}
);
