import { beforeEach, describe, expect, it, vi } from 'vitest';
import { machineUser, parseClientIds, readBearerToken } from './machineAuth';

const { introspectToken, podFeatures, privateEnv } = vi.hoisted(() => ({
	introspectToken: vi.fn(),
	podFeatures: new Map<string, boolean>(),
	privateEnv: {} as Record<string, string | undefined>
}));

vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_KC_REALM: 'knot-dots' } }));
vi.mock('$lib/server/keycloak', () => ({ introspectToken }));
vi.mock('$lib/server/podFeatures', () => ({ getPodFeatures: async () => podFeatures }));
vi.mock('$lib/server/db', () => ({
	createOrUpdateUser: vi.fn(() => async () => undefined),
	getPool: async () => ({ connect: async (query: () => unknown) => query() })
}));
vi.mock('$lib/server/sessionUser', () => ({
	enrichSessionUser: async (guid: string, roles: string[]) => ({
		adminOf: ['an-organization'],
		collaboratorOf: [],
		familyName: '',
		givenName: '',
		guid,
		headOf: [],
		memberOf: [],
		roles,
		settings: {}
	})
}));

const AGENT = '00000000-0000-4000-8000-000000000001';

function requestWith(authorization?: string) {
	return new Request('http://localhost/container', {
		headers: authorization ? { Authorization: authorization } : {}
	});
}

describe('readBearerToken', () => {
	it('reads the token out of a bearer header', () => {
		expect(readBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
		expect(readBearerToken('bearer abc')).toBe('abc');
	});

	it('ignores anything that is not a bearer header', () => {
		expect(readBearerToken(null)).toBeUndefined();
		expect(readBearerToken('')).toBeUndefined();
		expect(readBearerToken('Bearer')).toBeUndefined();
		expect(readBearerToken('Basic abc')).toBeUndefined();
	});
});

describe('parseClientIds', () => {
	it('splits on commas and whitespace', () => {
		expect(parseClientIds('a, b c')).toEqual(['a', 'b', 'c']);
	});

	it('treats an unset variable as no allowed clients', () => {
		expect(parseClientIds(undefined)).toEqual([]);
		expect(parseClientIds(' , ')).toEqual([]);
	});
});

describe('machineUser', () => {
	beforeEach(() => {
		introspectToken.mockReset();
		podFeatures.clear();
		podFeatures.set('MachineAuthentication', true);
		privateEnv.MACHINE_CLIENT_IDS = 'knot-dots-agent';
	});

	it('accepts an active token from an allowed client', async () => {
		introspectToken.mockResolvedValue({
			active: true,
			azp: 'knot-dots-agent',
			realm_access: { roles: ['default-roles-knot-dots'] },
			sub: AGENT
		});

		const user = await machineUser(requestWith('Bearer a-token'));

		expect(user).toMatchObject({
			adminOf: ['an-organization'],
			guid: AGENT,
			isAuthenticated: true,
			roles: ['default-roles-knot-dots']
		});
	});

	it('does not introspect a request without a bearer token', async () => {
		expect(await machineUser(requestWith())).toBeUndefined();
		expect(introspectToken).not.toHaveBeenCalled();
	});

	it('refuses every token while the deployment has not switched the feature on', async () => {
		podFeatures.clear();

		expect(await machineUser(requestWith('Bearer a-token'))).toBeUndefined();
		expect(introspectToken).not.toHaveBeenCalled();
	});

	it('refuses every token once the feature is switched off again', async () => {
		podFeatures.set('MachineAuthentication', false);

		expect(await machineUser(requestWith('Bearer a-token'))).toBeUndefined();
		expect(introspectToken).not.toHaveBeenCalled();
	});

	it('refuses every token while no machine client is configured', async () => {
		privateEnv.MACHINE_CLIENT_IDS = '';

		expect(await machineUser(requestWith('Bearer a-token'))).toBeUndefined();
		expect(introspectToken).not.toHaveBeenCalled();
	});

	it('refuses an inactive token', async () => {
		introspectToken.mockResolvedValue({ active: false });
		expect(await machineUser(requestWith('Bearer a-token'))).toBeUndefined();
	});

	it('refuses a token minted for the web application', async () => {
		introspectToken.mockResolvedValue({ active: true, azp: 'knot-dots', sub: AGENT });
		expect(await machineUser(requestWith('Bearer a-token'))).toBeUndefined();
	});

	it('refuses a token that names no subject', async () => {
		introspectToken.mockResolvedValue({ active: true, azp: 'knot-dots-agent' });
		expect(await machineUser(requestWith('Bearer a-token'))).toBeUndefined();
	});

	it('stays anonymous instead of failing when introspection breaks', async () => {
		introspectToken.mockRejectedValue(new Error('Keycloak is down'));
		await expect(machineUser(requestWith('Bearer a-token'))).resolves.toBeUndefined();
	});
});
