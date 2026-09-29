import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const getAllGrantsByContainers = vi.hoisted(() => vi.fn());
const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyOrganizationalUnitContainers = vi.hoisted(() => vi.fn());
const setContainerGrants = vi.hoisted(() => vi.fn());
const updateContainer = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/db', () => ({
	getAllGrantsByContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	setContainerGrants,
	updateContainer
}));

import { POST } from './+server';
import {
	composeUserGrants,
	type Grant,
	grantRecordsForRoleOn,
	grantSetForRole,
	grantTargets,
	type MemberRole,
	memberRoles
} from '$lib/models';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const measureGuid = '00000000-0000-4000-8000-000000000002';
const adminGuid = '00000000-0000-4000-8000-000000000003';
const headGuid = '00000000-0000-4000-8000-000000000004';
const observerGuid = '00000000-0000-4000-8000-000000000005';

const admin = {
	familyName: 'Admin',
	givenName: 'Test',
	grants: grantRecordsForRoleOn(memberRoles.enum.administrator, organizationGuid),
	guid: adminGuid,
	isAuthenticated: true,
	roles: [],
	settings: {}
};

function grantsFor(object: string, subject: string, role: MemberRole): Grant[] {
	const set = grantSetForRole(role);
	return [
		...set.self.map((kind) => ({ kind, object, subject, target: grantTargets.enum.self })),
		...set.subordinates.map((kind) => ({
			kind,
			object,
			subject,
			target: grantTargets.enum.subordinates
		}))
	];
}

// the container arrives at the endpoint enriched with the grants of the
// request user — an administrator of the organization in these tests
const adminSet = grantSetForRole(memberRoles.enum.administrator);

function measure(inheritsGrants: boolean, managedBy = measureGuid) {
	const ownMatrix = !inheritsGrants;
	return {
		guid: measureGuid,
		managed_by: [managedBy],
		organization: organizationGuid,
		organizational_unit: null,
		own_matrix: ownMatrix,
		payload: { title: 'Measure', type: 'measure', visibility: 'organization' },
		relation: [],
		user: [{ predicate: 'is-creator-of', subject: adminGuid }],
		user_grant: composeUserGrants({
			scopeSourced: !inheritsGrants ? false : true,
			governsItself: !inheritsGrants,
			organizationSelf: adminSet.self,
			organizationalUnitSelf: [],
			source: inheritsGrants ? organizationGuid : measureGuid,
			sourceSelf: inheritsGrants ? adminSet.self : [],
			sourceSubordinates: inheritsGrants ? adminSet.subordinates : []
		})
	};
}

function post(assignment: unknown) {
	const request = new Request(`http://localhost/container/${measureGuid}/grant-inheritance`, {
		method: 'POST',
		body: JSON.stringify(assignment),
		headers: { 'Content-Type': 'application/json' }
	});

	return POST({
		locals: {
			pool: {
				connect: vi
					.fn()
					.mockImplementation(async (value) =>
						typeof value === 'function' ? value(undefined) : value
					)
			},
			user: admin
		},
		params: { guid: measureGuid },
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	getAllGrantsByContainers.mockReturnValue(vi.fn().mockResolvedValue([]));
	setContainerGrants.mockReturnValue(vi.fn());
	updateContainer.mockReturnValue(vi.fn());
});

test('rejects containers without an inheritance flag', async () => {
	getContainerByGuid.mockReturnValue({
		guid: organizationGuid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload: { name: 'Org', type: 'organization', visibility: 'public' },
		relation: [],
		user: []
	});

	await expect(post({ inherit: false })).rejects.toMatchObject({ status: 422 });
	expect(updateContainer).not.toHaveBeenCalled();
});

test('does nothing when the flag already matches', async () => {
	getContainerByGuid.mockReturnValue(measure(true));

	const response = await post({ inherit: true });

	expect(response.status).toBe(204);
	expect(updateContainer).not.toHaveBeenCalled();
});

test('decoupling copies nothing and starts with an empty own matrix', async () => {
	getContainerByGuid.mockReturnValue(measure(true));
	getAllGrantsByContainers.mockImplementation(() =>
		vi
			.fn()
			.mockResolvedValue([
				...grantsFor(organizationGuid, adminGuid, memberRoles.enum.administrator),
				...grantsFor(organizationGuid, headGuid, memberRoles.enum.head),
				...grantsFor(organizationGuid, observerGuid, memberRoles.enum.observer)
			])
	);

	const response = await post({ inherit: false });

	expect(response.status).toBe(204);
	expect(updateContainer).toHaveBeenCalledWith(
		expect.objectContaining({
			own_matrix: true,
			user: [{ predicate: 'is-creator-of', subject: adminGuid }]
		})
	);
	expect(setContainerGrants).not.toHaveBeenCalled();
});

test('decoupling re-homes scope-managed containers to themselves', async () => {
	// otherwise the scope's subordinate grants would keep reaching the
	// decoupled container through the managed_by rules
	getContainerByGuid.mockReturnValue(measure(true, organizationGuid));

	const response = await post({ inherit: false });

	expect(response.status).toBe(204);
	expect(updateContainer).toHaveBeenCalledWith(
		expect.objectContaining({
			managed_by: [measureGuid],
			own_matrix: true
		})
	);
});

test('decoupling re-homes containers managed by a program or team as well', async () => {
	const teamGuid = '00000000-0000-4000-8000-000000000006';
	getContainerByGuid.mockReturnValue(measure(true, teamGuid));

	const response = await post({ inherit: false });

	expect(response.status).toBe(204);
	expect(updateContainer).toHaveBeenCalledWith(
		expect.objectContaining({
			managed_by: [measureGuid],
			own_matrix: true
		})
	);
});

test('re-enabling inheritance only resets the flag', async () => {
	getContainerByGuid.mockReturnValue(measure(false));

	const response = await post({ inherit: true });

	expect(response.status).toBe(204);
	expect(updateContainer).toHaveBeenCalledWith(
		expect.objectContaining({
			managed_by: [measureGuid],
			own_matrix: false
		})
	);
	expect(getAllGrantsByContainers).not.toHaveBeenCalled();
	expect(setContainerGrants).not.toHaveBeenCalled();
});
