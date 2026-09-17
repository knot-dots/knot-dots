import { encode } from '@auth/core/jwt';
import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, expect, test, vi } from 'vitest';
import { withFeatures } from '$lib/server/features';
import { withAuthentication } from './hooks.server';

const mocks = vi.hoisted(() => ({
	createOrUpdateUser: vi.fn(),
	getAllGrantsOfUser: vi.fn(),
	getAllGrantsOfUserFromMemberRoles: vi.fn(),
	getPodFeatures: vi.fn(),
	getPool: vi.fn(),
	getUser: vi.fn()
}));

vi.mock('$lib/server/db', () => mocks);

vi.mock('$lib/server/podFeatures', () => ({ getPodFeatures: mocks.getPodFeatures }));

vi.mock('$env/dynamic/private', () => ({
	env: { AUTH_SECRET: 'test-secret', KC_CLIENT_SECRET: 'test-client-secret' }
}));

const sessionTokenCookie = 'next-auth.session-token';

async function fetchSession() {
	const sessionToken = await encode({
		maxAge: 3600,
		salt: sessionTokenCookie,
		secret: 'test-secret',
		token: { roles: ['member'], sub: 'user-guid-1' }
	});
	const url = new URL('http://localhost:5173/auth/session');
	const event = {
		locals: {},
		request: new Request(url, {
			headers: { cookie: `${sessionTokenCookie}=${sessionToken}` }
		}),
		url
	} as RequestEvent;

	// withFeatures wraps authentication in the hooks sequence, so the session
	// callback reads the deployment-governed flags through getFeatures()
	return withFeatures({
		event,
		resolve: () =>
			withAuthentication({
				event,
				resolve: () => {
					throw new Error('expected SvelteKitAuth to respond to /auth/session');
				}
			})
	});
}

beforeEach(() => {
	vi.resetAllMocks();
	mocks.getPodFeatures.mockResolvedValue(new Map());
});

test('keeps the session when loading session data fails', async () => {
	mocks.getPool.mockRejectedValue(new Error('database unavailable'));

	const response = await fetchSession();
	expect(response.status).toBe(200);

	const setCookies = response.headers.getSetCookie();
	expect(setCookies.some((cookie) => cookie.startsWith(`${sessionTokenCookie}=;`))).toBe(false);

	const session = await response.json();
	expect(session?.user?.guid).toBe('user-guid-1');
	expect(session?.user?.roles).toEqual(['member']);
});

test('returns a session with user data and stored grants while the matrix is enabled', async () => {
	mocks.getPodFeatures.mockResolvedValue(new Map([['PermissionMatrix', true]]));
	mocks.getPool.mockResolvedValue({
		connect: async (routine: (connection: never) => Promise<unknown>) => routine(undefined as never)
	});
	mocks.getUser.mockReturnValue(async () => ({
		family_name: 'Mustermann',
		given_name: 'Erika',
		guid: 'user-guid-1',
		realm: 'knot-dots',
		settings: { features: ['ai'] }
	}));
	mocks.getAllGrantsOfUser.mockReturnValue(async () => [
		{ kind: 'read', object: 'org-1', subject: 'user-guid-1', target: 'self' },
		{ kind: 'update', object: 'org-1', subject: 'user-guid-1', target: 'self' },
		{ kind: 'read', object: 'org-2', subject: 'user-guid-1', target: 'subordinates' }
	]);

	const response = await fetchSession();
	const session = await response.json();

	expect(response.status).toBe(200);
	expect(session?.user?.guid).toBe('user-guid-1');
	expect(session?.user?.familyName).toBe('Mustermann');
	expect(session?.user?.grants?.self?.read).toEqual(['org-1']);
	expect(session?.user?.grants?.self?.update).toEqual(['org-1']);
	expect(session?.user?.grants?.subordinates?.read).toEqual(['org-2']);
	expect(mocks.getAllGrantsOfUserFromMemberRoles).not.toHaveBeenCalled();
});

test('derives the grants from member roles while the matrix is off', async () => {
	mocks.getPool.mockResolvedValue({
		connect: async (routine: (connection: never) => Promise<unknown>) => routine(undefined as never)
	});
	mocks.getUser.mockReturnValue(async () => ({
		family_name: 'Mustermann',
		given_name: 'Erika',
		guid: 'user-guid-1',
		realm: 'knot-dots',
		settings: {}
	}));
	mocks.getAllGrantsOfUserFromMemberRoles.mockReturnValue(async () => [
		{ kind: 'read', object: 'org-1', subject: 'user-guid-1', target: 'self' },
		{ kind: 'create', object: 'org-1', subject: 'user-guid-1', target: 'subordinates' }
	]);

	const response = await fetchSession();
	const session = await response.json();

	expect(response.status).toBe(200);
	expect(session?.user?.grants?.self?.read).toEqual(['org-1']);
	expect(session?.user?.grants?.subordinates?.create).toEqual(['org-1']);
	expect(mocks.getAllGrantsOfUser).not.toHaveBeenCalled();
});
