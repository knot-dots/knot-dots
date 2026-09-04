import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyOrganizationalUnitContainers = vi.hoisted(() => vi.fn());
const setContainerGrants = vi.hoisted(() => vi.fn());
const updateMemberRole = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/db', () => ({
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	setContainerGrants,
	updateMemberRole
}));

import { POST } from './+server';
import { grantRecordsForRoleOn, grantSetForRole, memberRoles } from '$lib/models';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const measureGuid = '00000000-0000-4000-8000-000000000002';
const adminGuid = '00000000-0000-4000-8000-000000000003';
const otherAdminGuid = '00000000-0000-4000-8000-000000000004';
const memberGuid = '00000000-0000-4000-8000-000000000005';

const admin = {
	familyName: 'Admin',
	givenName: 'Test',
	grants: grantRecordsForRoleOn(memberRoles.enum.administrator, organizationGuid),
	guid: adminGuid,
	isAuthenticated: true,
	roles: [],
	settings: {}
};

const administratorSet = grantSetForRole(memberRoles.enum.administrator);
const headSet = grantSetForRole(memberRoles.enum.head);

function organization(adminSubjects: string[]) {
	return {
		guid: organizationGuid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload: { name: 'Org', type: 'organization', visibility: 'public' },
		relation: [],
		user: [
			...adminSubjects.map((subject) => ({ predicate: 'is-admin-of', subject })),
			...adminSubjects.map((subject) => ({ predicate: 'is-member-of', subject })),
			{ predicate: 'is-member-of', subject: memberGuid }
		]
	};
}

function measure() {
	return {
		guid: measureGuid,
		managed_by: [measureGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload: { title: 'Measure', type: 'measure', visibility: 'organization' },
		relation: [],
		user: [{ predicate: 'is-member-of', subject: memberGuid }]
	};
}

function post(guid: string, assignment: unknown) {
	const request = new Request(`http://localhost/container/${guid}/grant`, {
		method: 'POST',
		body: JSON.stringify(assignment),
		headers: { 'Content-Type': 'application/json' }
	});

	const run = vi
		.fn()
		.mockImplementation(async (value) => (typeof value === 'function' ? value(undefined) : value));

	return POST({
		locals: {
			pool: { connect: run, transaction: run },
			user: admin
		},
		params: { guid },
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	setContainerGrants.mockReturnValue(vi.fn());
	updateMemberRole.mockReturnValue(vi.fn());
});

test('stores an individual grant set and derives the member role', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid]));

	const set = { self: ['read'], subordinates: ['read', 'update'] };
	const response = await post(organizationGuid, { subject: memberGuid, ...set });

	expect(response.status).toBe(204);
	expect(updateMemberRole).toHaveBeenCalledWith(
		expect.objectContaining({ guid: organizationGuid }),
		memberGuid,
		'observer'
	);
	expect(setContainerGrants).toHaveBeenCalledWith(organizationGuid, memberGuid, set);
});

test('a subject granted every kind becomes an administrator', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid]));

	const response = await post(organizationGuid, { subject: memberGuid, ...administratorSet });

	expect(response.status).toBe(204);
	expect(updateMemberRole).toHaveBeenCalledWith(
		expect.objectContaining({ guid: organizationGuid }),
		memberGuid,
		'administrator'
	);
	expect(setContainerGrants).toHaveBeenCalledWith(organizationGuid, memberGuid, administratorSet);
});

test('rejects the full grant set on other container types', async () => {
	getContainerByGuid.mockReturnValue(measure());

	await expect(
		post(measureGuid, { subject: memberGuid, ...administratorSet })
	).rejects.toMatchObject({ status: 422 });
	expect(updateMemberRole).not.toHaveBeenCalled();
	expect(setContainerGrants).not.toHaveBeenCalled();
});

test('rejects kinds that are not available for the target', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid]));

	await expect(
		post(organizationGuid, { subject: memberGuid, self: ['create'], subordinates: [] })
	).rejects.toMatchObject({ status: 422 });
	expect(setContainerGrants).not.toHaveBeenCalled();
});

test('the last administrator may not lose any grant', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid]));

	await expect(post(organizationGuid, { subject: adminGuid, ...headSet })).rejects.toMatchObject({
		status: 422
	});
	expect(updateMemberRole).not.toHaveBeenCalled();
	expect(setContainerGrants).not.toHaveBeenCalled();
});

test('one of several administrators may lose grants', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid, otherAdminGuid]));

	const response = await post(organizationGuid, { subject: otherAdminGuid, ...headSet });

	expect(response.status).toBe(204);
	expect(updateMemberRole).toHaveBeenCalledWith(
		expect.objectContaining({ guid: organizationGuid }),
		otherAdminGuid,
		'head'
	);
	expect(setContainerGrants).toHaveBeenCalledWith(organizationGuid, otherAdminGuid, headSet);
});

test('empty grant sets remove the subject', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid]));

	const response = await post(organizationGuid, {
		subject: memberGuid,
		self: [],
		subordinates: []
	});

	expect(response.status).toBe(204);
	expect(updateMemberRole).toHaveBeenCalledWith(
		expect.objectContaining({ guid: organizationGuid }),
		memberGuid,
		null
	);
	expect(setContainerGrants).toHaveBeenCalledWith(organizationGuid, memberGuid, {
		self: [],
		subordinates: []
	});
});
