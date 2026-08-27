import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const getMembers = vi.hoisted(() => vi.fn());
const getAllRelatedUsersByContainers = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/keycloak', () => ({ getMembers }));

vi.mock('$lib/server/db', () => ({ getAllRelatedUsersByContainers }));

import { load } from './+page.server';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const organizationalUnitGuid = '00000000-0000-4000-8000-000000000002';
const userGuid = '00000000-0000-4000-8000-000000000003';

const currentOrganization = {
	guid: organizationGuid,
	organization: organizationGuid,
	payload: { type: 'organization' },
	relation: []
};

const currentOrganizationalUnit = {
	guid: organizationalUnitGuid,
	organization: organizationGuid,
	payload: { type: 'organizational_unit' },
	relation: []
};

function user(adminOf: string[], headOf: string[] = []) {
	return {
		adminOf,
		collaboratorOf: [],
		familyName: 'Admin',
		givenName: 'Test',
		guid: userGuid,
		headOf,
		isAuthenticated: true,
		memberOf: [],
		roles: [],
		settings: {}
	};
}

function event(adminOf: string[], headOf: string[] = []) {
	return {
		locals: {
			pool: { connect: vi.fn().mockResolvedValue([]) },
			user: user(adminOf, headOf)
		},
		parent: vi.fn().mockResolvedValue({
			currentOrganization,
			currentOrganizationalUnit,
			organizationalUnits: [currentOrganizationalUnit]
		})
	} as never;
}

beforeEach(() => {
	getMembers.mockReset().mockResolvedValue([]);
	getAllRelatedUsersByContainers.mockReset().mockReturnValue(vi.fn());
});

test('grants organization admins access to the user management of an organizational unit', async () => {
	const { container } = await load(event([organizationGuid]));

	expect(container.guid).toBe(organizationalUnitGuid);
});

test('grants organizational unit admins access to the user management of their unit', async () => {
	const { container } = await load(event([organizationalUnitGuid]));

	expect(container.guid).toBe(organizationalUnitGuid);
});

test('grants heads of the organization access to the user management of an organizational unit', async () => {
	const { container } = await load(event([], [organizationGuid]));

	expect(container.guid).toBe(organizationalUnitGuid);
});

test('responds with 404 for users without admin rights', async () => {
	await expect(load(event([]))).rejects.toMatchObject({ status: 404 });
});
