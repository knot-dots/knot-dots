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
	type Grant,
	type GrantSet,
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

function measure(inheritsGrants: boolean, managedBy = measureGuid) {
	return {
		guid: measureGuid,
		managed_by: [managedBy],
		organization: organizationGuid,
		organizational_unit: null,
		payload: { inheritsGrants, title: 'Measure', type: 'measure', visibility: 'organization' },
		relation: [],
		user: [{ predicate: 'is-creator-of', subject: adminGuid }]
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

test('decoupling copies the scope matrix except administrators', async () => {
	getContainerByGuid.mockReturnValue(measure(true));
	getAllGrantsByContainers.mockImplementation((guids: string[]) =>
		vi
			.fn()
			.mockResolvedValue(
				guids[0] === organizationGuid
					? [
							...grantsFor(organizationGuid, adminGuid, memberRoles.enum.administrator),
							...grantsFor(organizationGuid, headGuid, memberRoles.enum.head),
							...grantsFor(organizationGuid, observerGuid, memberRoles.enum.observer)
						]
					: []
			)
	);

	const response = await post({ inherit: false });

	expect(response.status).toBe(204);
	expect(updateContainer).toHaveBeenCalledWith(
		expect.objectContaining({
			payload: expect.objectContaining({ inheritsGrants: false }),
			user: expect.arrayContaining([
				{ predicate: 'is-creator-of', subject: adminGuid },
				{ predicate: 'is-head-of', subject: headGuid },
				{ predicate: 'is-member-of', subject: headGuid },
				{ predicate: 'is-member-of', subject: observerGuid }
			])
		})
	);
	expect(setContainerGrants).toHaveBeenCalledWith(
		measureGuid,
		headGuid,
		grantSetForRole(memberRoles.enum.head)
	);
	expect(setContainerGrants).toHaveBeenCalledWith(
		measureGuid,
		observerGuid,
		grantSetForRole(memberRoles.enum.observer)
	);
	// scope administrators keep their access through the authorization rules
	// and must not become removable object administrators
	expect(setContainerGrants).not.toHaveBeenCalledWith(measureGuid, adminGuid, expect.anything());
});

test('subjects with own grants keep them when decoupling', async () => {
	getContainerByGuid.mockReturnValue(measure(true));
	const ownSet: GrantSet = { self: ['read'], subordinates: ['read', 'update'] };
	getAllGrantsByContainers.mockImplementation((guids: string[]) =>
		vi.fn().mockResolvedValue(
			guids[0] === organizationGuid
				? grantsFor(organizationGuid, headGuid, memberRoles.enum.head)
				: [
						...ownSet.self.map((kind) => ({
							kind,
							object: measureGuid,
							subject: headGuid,
							target: grantTargets.enum.self
						})),
						...ownSet.subordinates.map((kind) => ({
							kind,
							object: measureGuid,
							subject: headGuid,
							target: grantTargets.enum.subordinates
						}))
					]
		)
	);

	const response = await post({ inherit: false });

	expect(response.status).toBe(204);
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
			payload: expect.objectContaining({ inheritsGrants: false })
		})
	);
});

test('decoupling keeps containers managed by another team with their team', async () => {
	const teamGuid = '00000000-0000-4000-8000-000000000006';
	getContainerByGuid.mockReturnValue(measure(true, teamGuid));

	const response = await post({ inherit: false });

	expect(response.status).toBe(204);
	expect(updateContainer).toHaveBeenCalledWith(
		expect.objectContaining({
			managed_by: [teamGuid],
			payload: expect.objectContaining({ inheritsGrants: false })
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
			payload: expect.objectContaining({ inheritsGrants: true })
		})
	);
	expect(getAllGrantsByContainers).not.toHaveBeenCalled();
	expect(setContainerGrants).not.toHaveBeenCalled();
});
