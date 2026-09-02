import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const addUserToGroup = vi.hoisted(() => vi.fn());
const createKeycloakUser = vi.hoisted(() => vi.fn());
const findUserByEmail = vi.hoisted(() => vi.fn());
const sendVerificationEmail = vi.hoisted(() => vi.fn());
const createOrUpdateUser = vi.hoisted(() => vi.fn());
const createUser = vi.hoisted(() => vi.fn());
const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyOrganizationContainers = vi.hoisted(() => vi.fn());
const updateContainer = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/keycloak', () => ({
	addUserToGroup,
	createUser: createKeycloakUser,
	findUserByEmail
}));

vi.mock('$lib/server/email', () => ({ sendVerificationEmail }));

vi.mock('$lib/server/db', () => ({
	createOrUpdateUser,
	createUser,
	getContainerByGuid,
	getManyOrganizationContainers,
	updateContainer
}));

import { POST } from './+server';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const adminGuid = '00000000-0000-4000-8000-000000000002';
const inviteeGuid = '00000000-0000-4000-8000-000000000003';

const container = {
	guid: organizationGuid,
	managed_by: [organizationGuid],
	organization: organizationGuid,
	organizational_unit: null,
	payload: { name: 'Org', type: 'organization', visibility: 'public' },
	realm: 'test',
	relation: [],
	revision: 1,
	user: [],
	valid_currently: true,
	valid_from: new Date().toISOString()
};

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

const invitee = {
	family_name: 'Ukulele',
	given_name: 'Uma',
	guid: inviteeGuid,
	realm: 'test',
	settings: {}
};

function post(email: string) {
	const request = new Request('http://localhost/user', {
		method: 'POST',
		body: JSON.stringify({ container, email, role: 'observer' }),
		headers: { 'Content-Type': 'application/json' }
	});

	return POST({
		locals: {
			pool: {
				connect: vi.fn().mockImplementation(async (value) => value),
				transaction: vi.fn().mockImplementation(async (value) => value)
			},
			user: admin
		},
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	getContainerByGuid.mockReturnValue(container);
	createOrUpdateUser.mockReturnValue(invitee);
	createUser.mockReturnValue(invitee);
	getManyOrganizationContainers.mockReturnValue([container]);
	updateContainer.mockReturnValue(container);
});

test('invites a registered user found by their email address', async () => {
	findUserByEmail.mockResolvedValue({
		firstName: 'Uma',
		id: inviteeGuid,
		lastName: 'Ukulele'
	});

	const response = await post('uma@example.org');

	expect(response.status).toBe(201);
	expect(createKeycloakUser).not.toHaveBeenCalled();
	expect(addUserToGroup).toHaveBeenCalled();
});

test('rejects input that is not an email address without creating an account', async () => {
	await expect(post('nobody')).rejects.toMatchObject({ status: 422 });
	expect(createKeycloakUser).not.toHaveBeenCalled();
	expect(sendVerificationEmail).not.toHaveBeenCalled();
});

test('creates an account for an unknown email address', async () => {
	findUserByEmail.mockRejectedValue(new Error('not found'));
	createKeycloakUser.mockResolvedValue(inviteeGuid);

	const response = await post('uma@example.org');

	expect(response.status).toBe(201);
	expect(createKeycloakUser).toHaveBeenCalledWith('uma@example.org');
	expect(sendVerificationEmail).toHaveBeenCalled();
});
