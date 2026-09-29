import { expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const getAllRelatedUsers = vi.hoisted(() => vi.fn());
const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyOrganizationalUnitContainers = vi.hoisted(() => vi.fn());
const updateContainer = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({
	getAllRelatedUsers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	updateContainer
}));

vi.mock('$lib/server/keycloak', () => ({ getMembers: vi.fn() }));

import { POST } from './+server';
import { emptyGrantRecords, grantRecordsForRoleOn, memberRoles } from '$lib/models';

locale.set('en');

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const adminGuid = '00000000-0000-4000-8000-000000000002';
const memberGuid = '00000000-0000-4000-8000-000000000003';

function user(grants: ReturnType<typeof emptyGrantRecords>) {
	return {
		familyName: 'User',
		givenName: 'Test',
		grants,
		guid: '00000000-0000-4000-8000-000000000004',
		isAuthenticated: true,
		roles: [],
		settings: {}
	};
}

function organizationContainer() {
	return {
		guid: organizationGuid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload: { type: 'organization' },
		relation: [],
		user: [
			{ predicate: 'is-admin-of', subject: adminGuid },
			{ predicate: 'is-member-of', subject: adminGuid },
			{ predicate: 'is-member-of', subject: memberGuid }
		]
	};
}

function post(currentUser: unknown, relations: unknown) {
	const request = new Request(`http://localhost/container/${organizationGuid}/user`, {
		method: 'POST',
		body: JSON.stringify(relations),
		headers: { 'Content-Type': 'application/json' }
	});

	const connect = vi
		.fn()
		.mockImplementation(async (value) => (typeof value === 'function' ? value(undefined) : value));

	return POST({
		locals: { pool: { connect }, user: currentUser },
		params: { guid: organizationGuid },
		request
	} as never);
}

test('member role changes require permission to manage users', async () => {
	getContainerByGuid.mockReturnValue(organizationContainer());
	getManyOrganizationalUnitContainers.mockReturnValue([]);

	await expect(
		post(user(grantRecordsForRoleOn(memberRoles.enum.observer, organizationGuid)), [])
	).rejects.toMatchObject({ status: 403 });
	expect(updateContainer).not.toHaveBeenCalled();
});

test('administrators may not be removed or demoted', async () => {
	getContainerByGuid.mockReturnValue(organizationContainer());

	await expect(
		post(user(grantRecordsForRoleOn(memberRoles.enum.administrator, organizationGuid)), [
			{ predicate: 'is-member-of', subject: adminGuid },
			{ predicate: 'is-member-of', subject: memberGuid }
		])
	).rejects.toMatchObject({ status: 422 });
	expect(updateContainer).not.toHaveBeenCalled();
});

test('appointing administrators is reserved for administrators of the scope', async () => {
	// heads of a measure may manage its users but not hand out is-admin-of
	const measureGuid = '00000000-0000-4000-8000-000000000005';
	getContainerByGuid.mockReturnValue({
		guid: measureGuid,
		managed_by: [measureGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload: { title: 'Measure', type: 'measure', visibility: 'organization' },
		relation: [],
		user: [{ predicate: 'is-member-of', subject: memberGuid }]
	});

	await expect(
		post(user(grantRecordsForRoleOn(memberRoles.enum.head, measureGuid)), [
			{ predicate: 'is-admin-of', subject: memberGuid },
			{ predicate: 'is-member-of', subject: memberGuid }
		])
	).rejects.toMatchObject({ status: 403 });
	expect(updateContainer).not.toHaveBeenCalled();
});

test('administrators of the scope may change other member roles', async () => {
	getContainerByGuid.mockReturnValue(organizationContainer());
	updateContainer.mockReturnValue(vi.fn());

	const response = await post(
		user(grantRecordsForRoleOn(memberRoles.enum.administrator, organizationGuid)),
		[
			{ predicate: 'is-admin-of', subject: adminGuid },
			{ predicate: 'is-member-of', subject: adminGuid },
			{ predicate: 'is-member-of', subject: memberGuid },
			{ predicate: 'is-collaborator-of', subject: memberGuid }
		]
	);

	expect(response.status).toBe(204);
	expect(updateContainer).toHaveBeenCalled();
});
