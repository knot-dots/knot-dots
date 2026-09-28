import { beforeEach, expect, test, vi } from 'vitest';

const getMembers = vi.hoisted(() => vi.fn());
const getOrganizationMemberships = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({ getOrganizationMemberships }));
vi.mock('$lib/server/keycloak', () => ({ getMembers }));

import { McpUserError, searchMcpOrganizationUsers } from '$lib/server/mcp/users';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';

beforeEach(() => {
	getMembers.mockReset();
	getOrganizationMemberships.mockReset();
	getOrganizationMemberships.mockReturnValue(async () => [
		{ guid: organizationGuid, name: 'Anytown', role: 'observer', slug: 'anytown' }
	]);
	getMembers.mockResolvedValue([
		{
			email: 'niels@example.com',
			emailVerified: true,
			enabled: true,
			firstName: 'Niels',
			id: userId,
			lastName: 'Example',
			username: 'niels@example.com'
		},
		{
			email: 'hidden@example.com',
			emailVerified: true,
			enabled: false,
			firstName: 'Hidden',
			id: '00000000-0000-4000-8000-000000000003',
			lastName: 'User',
			username: 'hidden@example.com'
		}
	]);
});

test('returns only enabled member GUIDs and display names', async () => {
	await expect(
		searchMcpOrganizationUsers({
			limit: 50,
			offset: 0,
			organizationGuid,
			terms: 'niels',
			userId
		})({} as never)
	).resolves.toEqual({
		nextOffset: null,
		users: [{ guid: userId, name: 'Niels Example' }]
	});
});

test('does not query members when the token owner is not an organization member', async () => {
	getOrganizationMemberships.mockReturnValue(async () => []);

	await expect(
		searchMcpOrganizationUsers({
			limit: 50,
			offset: 0,
			organizationGuid,
			terms: undefined,
			userId
		})({} as never)
	).rejects.toEqual(expect.any(McpUserError));
	expect(getMembers).not.toHaveBeenCalled();
});
