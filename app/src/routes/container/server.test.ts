import { NotFoundError } from 'slonik';
import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const createContainer = vi.hoisted(() => vi.fn());
const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyContainers = vi.hoisted(() => vi.fn());
const getManyOrganizationContainers = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/db', () => ({
	createContainer,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationContainers
}));

vi.mock('$lib/server/categoryOptions', () => ({
	loadCategoryContext: vi.fn()
}));

import { POST } from './+server';
import {
	composeUserGrants,
	grantRecordsForRoleOn,
	grantSetForRole,
	memberRoles
} from '$lib/models';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const otherOrganizationGuid = '00000000-0000-4000-8000-000000000002';
const memberGuid = '00000000-0000-4000-8000-000000000003';
const unknownGuid = '00000000-0000-4000-8000-00000000dead';

const headSet = grantSetForRole(memberRoles.enum.head);

function user(roles: string[] = []) {
	return {
		familyName: 'Head',
		givenName: 'Test',
		grants: grantRecordsForRoleOn(memberRoles.enum.head, organizationGuid),
		guid: memberGuid,
		isAuthenticated: true,
		roles,
		settings: {}
	};
}

// the parent arrives at the guard enriched with the grants of the request
// user — a head of their own organization in these tests
function organization() {
	return {
		guid: organizationGuid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		realm: 'knot-dots',
		payload: { name: 'Org', type: 'organization', visibility: 'public' },
		relation: [],
		user_grant: composeUserGrants({
			scopeSourced: true,
			governsItself: true,
			organizationSelf: headSet.self,
			organizationalUnitSelf: [],
			source: organizationGuid,
			sourceSelf: headSet.self,
			sourceSubordinates: headSet.subordinates
		}),
		user: []
	};
}

function newGoal(organization: string, relation: unknown[] = []) {
	return {
		managed_by: [organization],
		organization,
		organizational_unit: null,
		payload: { title: 'Goal', type: 'goal' },
		realm: 'knot-dots',
		relation,
		user: []
	};
}

function post(body: unknown, roles: string[] = []) {
	const request = new Request('http://localhost/container', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' }
	});

	const run = vi
		.fn()
		.mockImplementation(async (value) => (typeof value === 'function' ? value(undefined) : value));

	return POST({
		locals: {
			features: [],
			pool: { connect: run, transaction: run },
			user: user(roles)
		},
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	createContainer.mockImplementation((container) => async () => ({
		...container,
		guid: unknownGuid
	}));
});

test('creating within a readable parent of the same organization succeeds', async () => {
	getContainerByGuid.mockReturnValue(organization());

	const response = await post(newGoal(organizationGuid));

	expect(response.status).toBe(201);
	expect(createContainer).toHaveBeenCalled();
});

test('a relation pointing at a non-existent parent is refused', async () => {
	getContainerByGuid.mockImplementation(() => async () => {
		throw new NotFoundError('not found', { sql: 'SELECT 1', values: [] });
	});

	await expect(
		post(
			newGoal(otherOrganizationGuid, [
				{ object: unknownGuid, position: 0, predicate: 'is-part-of' }
			])
		)
	).rejects.toMatchObject({ status: 403 });
	expect(createContainer).not.toHaveBeenCalled();
});

test('a parent from another organization than the persisted one is refused', async () => {
	getContainerByGuid.mockReturnValue(organization());

	await expect(
		post(
			newGoal(otherOrganizationGuid, [
				{ object: organizationGuid, position: 0, predicate: 'is-part-of' }
			])
		)
	).rejects.toMatchObject({ status: 403 });
	expect(createContainer).not.toHaveBeenCalled();
});

test('sysadmins may create containers without an existing parent', async () => {
	getContainerByGuid.mockImplementation(() => async () => {
		throw new NotFoundError('not found', { sql: 'SELECT 1', values: [] });
	});

	const response = await post(newGoal(otherOrganizationGuid), ['sysadmin']);

	expect(response.status).toBe(201);
	expect(createContainer).toHaveBeenCalled();
});
