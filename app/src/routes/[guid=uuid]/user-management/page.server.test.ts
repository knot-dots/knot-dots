import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const getMembers = vi.hoisted(() => vi.fn());
const getAllGrantsByContainers = vi.hoisted(() => vi.fn());
const getAllRelatedUsersByContainers = vi.hoisted(() => vi.fn());
const getContainerByGuid = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/keycloak', () => ({ getMembers }));

vi.mock('$lib/server/db', () => ({
	getAllGrantsByContainers,
	getAllRelatedUsersByContainers,
	getContainerByGuid
}));

import { load } from './+page.server';
import {
	composeUserGrants,
	emptyGrantRecords,
	grantKinds,
	grantRecordsForRoleOn,
	grantTargets,
	memberRoles
} from '$lib/models';

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

function user(grants: ReturnType<typeof emptyGrantRecords>) {
	return {
		familyName: 'Admin',
		givenName: 'Test',
		grants,
		guid: userGuid,
		isAuthenticated: true,
		roles: [],
		settings: {}
	};
}

// the containers from the layout arrive enriched with the request user's
// grants; this mirrors computeUserGrants for the plain fixtures
function enriched(
	container: typeof currentOrganization,
	grants: ReturnType<typeof emptyGrantRecords>
) {
	const kindsAt = (object: string, target: 'self' | 'subordinates') =>
		grantKinds.options.filter((kind) => grants[target][kind].includes(object));
	const holdsRowsOn = (object: string) =>
		grantTargets.options.some((target) => kindsAt(object, target).length > 0);
	const source =
		container.payload.type === 'organization' || holdsRowsOn(container.guid)
			? container.guid
			: container.organization;
	return {
		...container,
		grant: composeUserGrants({
			areaSourced: true,
			governsItself: source === container.guid,
			organizationSelf: kindsAt(container.organization, 'self'),
			organizationalUnitSelf: [],
			source,
			sourceSelf: kindsAt(source, 'self'),
			sourceSubordinates: kindsAt(source, 'subordinates')
		})
	};
}

function event(grants = emptyGrantRecords()) {
	return {
		locals: {
			pool: { connect: vi.fn().mockResolvedValue([]) },
			user: user(grants)
		},
		parent: vi.fn().mockResolvedValue({
			currentOrganization: enriched(currentOrganization, grants),
			currentOrganizationalUnit: enriched(currentOrganizationalUnit, grants),
			organizationalUnits: [enriched(currentOrganizationalUnit, grants)]
		})
	} as never;
}

beforeEach(() => {
	getMembers.mockReset().mockResolvedValue([]);
	getAllGrantsByContainers.mockReset().mockReturnValue(vi.fn());
	getAllRelatedUsersByContainers.mockReset().mockReturnValue(vi.fn());
});

test('grants organization admins access to the user management of an organizational unit', async () => {
	const { container } = await load(
		event(grantRecordsForRoleOn(memberRoles.enum.administrator, organizationGuid))
	);

	expect(container.guid).toBe(organizationalUnitGuid);
});

test('grants organizational unit admins access to the user management of their unit', async () => {
	const { container } = await load(
		event(grantRecordsForRoleOn(memberRoles.enum.administrator, organizationalUnitGuid))
	);

	expect(container.guid).toBe(organizationalUnitGuid);
});

test('grants heads of the organization access to the user management of an organizational unit', async () => {
	const { container } = await load(
		event(grantRecordsForRoleOn(memberRoles.enum.head, organizationGuid))
	);

	expect(container.guid).toBe(organizationalUnitGuid);
});

test('responds with 404 for users without admin rights', async () => {
	await expect(load(event())).rejects.toMatchObject({ status: 404 });
});
