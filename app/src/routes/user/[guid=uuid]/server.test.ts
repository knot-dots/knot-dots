import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const createOrUpdateUser = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/db', () => ({ createOrUpdateUser }));
vi.mock('$lib/server/keycloak', () => ({ updateUser }));

import { PUT } from './+server';

const guid = '00000000-0000-4000-8000-000000000001';
const favorite = [{ href: '/', title: 'Home' }];

function put(features: string[], { roles = [] as string[], target = guid } = {}) {
	const body = {
		family_name: 'Tester',
		given_name: 'Tina',
		guid: target,
		realm: 'test',
		settings: { favorite, features }
	};
	const request = new Request(`http://localhost/user/${target}`, {
		method: 'PUT',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' }
	});

	return PUT({
		locals: {
			pool: { connect: vi.fn().mockImplementation(async (value) => value) },
			user: { guid, isAuthenticated: true, roles, settings: {} }
		},
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	createOrUpdateUser.mockImplementation((user) => user);
});

test('drops alpha features chosen by users who are not alpha testers', async () => {
	const response = await put(['MCP', 'IOOI']);

	expect(response.status).toBe(200);
	const saved = { settings: { favorite, features: ['IOOI'] } };
	expect(createOrUpdateUser).toHaveBeenCalledWith(expect.objectContaining(saved));
	expect(updateUser).toHaveBeenCalledWith(expect.objectContaining(saved));
});

test('keeps alpha features chosen by alpha testers', async () => {
	const response = await put(['MCP', 'IOOI'], { roles: ['alpha-testing'] });

	expect(response.status).toBe(200);
	expect(createOrUpdateUser).toHaveBeenCalledWith(
		expect.objectContaining({ settings: { favorite, features: ['MCP', 'IOOI'] } })
	);
});

test('refuses to change the settings of another user', async () => {
	await expect(
		put(['IOOI'], { target: '00000000-0000-4000-8000-000000000002' })
	).rejects.toMatchObject({ status: 403 });
	expect(createOrUpdateUser).not.toHaveBeenCalled();
});
