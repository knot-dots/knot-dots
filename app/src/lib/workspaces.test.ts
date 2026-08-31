import { expect, test } from 'vitest';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	anyContainer,
	type Container,
	type OrganizationalUnitPayload,
	type OrganizationPayload,
	payloadTypes
} from '$lib/models';
import type { User } from '$lib/stores';
import { getVisibleWorkspaces } from '$lib/workspaces';

const testContainer = anyContainer.extend({
	organizational_unit: z.uuid().nullable().default(null),
	realm: z.string().max(1024).default('test'),
	revision: z.number().int().positive().default(1),
	valid_currently: z.boolean().default(true),
	valid_from: z.coerce.date().default(() => new Date())
});

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const organizationalUnitGuid = '00000000-0000-4000-8000-000000000002';

const organization = testContainer.parse({
	guid: organizationGuid,
	managed_by: [organizationGuid],
	organization: organizationGuid,
	payload: { name: 'Anytown', type: payloadTypes.enum.organization }
}) as Container<OrganizationPayload>;

const organizationalUnit = testContainer.parse({
	guid: organizationalUnitGuid,
	managed_by: organization.managed_by,
	organization: organization.guid,
	payload: { name: 'Anytown school administration', type: payloadTypes.enum.organizational_unit }
}) as Container<OrganizationalUnitPayload>;

function user(overrides: Partial<User>): User {
	return {
		creatableOf: [],
		deletableOf: [],
		familyName: 'Admin',
		givenName: 'Test',
		guid: '00000000-0000-4000-8000-000000000003',
		isAuthenticated: true,
		manageMembersOf: [],
		readableOf: [],
		roles: [],
		settings: {},
		updatableOf: [],
		...overrides
	};
}

function visibleWorkspaceKeys(u: User) {
	return getVisibleWorkspaces({
		organization,
		organizationalUnit,
		features: createFeatureDecisions([]),
		ability: defineAbilityFor(u)
	}).map(({ key }) => key);
}

test('shows the users workspace of an organizational unit to organization admins', () => {
	expect(visibleWorkspaceKeys(user({ manageMembersOf: [organizationGuid] }))).toContain('users');
});

test('shows the users workspace of an organizational unit to its admins', () => {
	expect(visibleWorkspaceKeys(user({ manageMembersOf: [organizationalUnitGuid] }))).toContain(
		'users'
	);
});

test('shows the users workspace of an organizational unit to heads of the organization', () => {
	expect(visibleWorkspaceKeys(user({ manageMembersOf: [organizationGuid] }))).toContain('users');
});

test('hides the users workspace from users without the manage-members kind', () => {
	expect(visibleWorkspaceKeys(user({}))).not.toContain('users');
});
