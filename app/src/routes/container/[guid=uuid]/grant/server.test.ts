import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyOrganizationalUnitContainers = vi.hoisted(() => vi.fn());
const updateMemberRole = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/db', () => ({
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	updateMemberRole
}));

import { POST } from './+server';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const measureGuid = '00000000-0000-4000-8000-000000000002';
const adminGuid = '00000000-0000-4000-8000-000000000003';
const otherAdminGuid = '00000000-0000-4000-8000-000000000004';
const memberGuid = '00000000-0000-4000-8000-000000000005';

const admin = {
	adminOf: [organizationGuid],
	collaboratorOf: [],
	familyName: 'Admin',
	givenName: 'Test',
	guid: adminGuid,
	headOf: [],
	isAuthenticated: true,
	memberOf: [organizationGuid],
	roles: [],
	settings: {}
};

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

	return POST({
		locals: {
			pool: { connect: vi.fn().mockImplementation(async (value) => value) },
			user: admin
		},
		params: { guid },
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	updateMemberRole.mockReturnValue(undefined);
});

test('assigns the administrator role on an organization', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid]));

	const response = await post(organizationGuid, { role: 'administrator', subject: memberGuid });

	expect(response.status).toBe(204);
	expect(updateMemberRole).toHaveBeenCalledWith(
		expect.objectContaining({ guid: organizationGuid }),
		memberGuid,
		'administrator'
	);
});

test('rejects the administrator role on other container types', async () => {
	getContainerByGuid.mockReturnValue(measure());

	await expect(
		post(measureGuid, { role: 'administrator', subject: memberGuid })
	).rejects.toMatchObject({ status: 422 });
	expect(updateMemberRole).not.toHaveBeenCalled();
});

test('the last administrator may not be demoted', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid]));

	await expect(post(organizationGuid, { role: 'head', subject: adminGuid })).rejects.toMatchObject({
		status: 422
	});
	expect(updateMemberRole).not.toHaveBeenCalled();
});

test('one of several administrators may be demoted', async () => {
	getContainerByGuid.mockReturnValue(organization([adminGuid, otherAdminGuid]));

	const response = await post(organizationGuid, { role: 'head', subject: otherAdminGuid });

	expect(response.status).toBe(204);
	expect(updateMemberRole).toHaveBeenCalledWith(
		expect.objectContaining({ guid: organizationGuid }),
		otherAdminGuid,
		'head'
	);
});
