import { beforeEach, expect, test, vi } from 'vitest';

const databaseOperation = vi.hoisted(() => vi.fn());
const insertMcpToken = vi.hoisted(() => vi.fn(() => databaseOperation));
const generateMcpToken = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({
	createMcpToken: insertMcpToken,
	getMcpTokensForUser: vi.fn(),
	revokeMcpToken: vi.fn()
}));

vi.mock('$lib/server/mcp/tokens', () => ({ generateMcpToken }));

import { actions } from './+page.server';

const userId = '00000000-0000-4000-8000-000000000001';

beforeEach(() => {
	databaseOperation.mockReset();
	insertMcpToken.mockClear();
	generateMcpToken.mockReset();
	generateMcpToken.mockReturnValue({
		prefix: 'mcp_pat_example',
		secretHash: Buffer.from('hash'),
		token: `mcp_pat_${'a'.repeat(43)}`
	});
});

test('creates read-only tokens by default', async () => {
	const connect = vi.fn().mockResolvedValue(undefined);
	const request = new Request('http://localhost/me/settings/tokens?/create', {
		body: new URLSearchParams({ name: 'Claude' }),
		method: 'POST'
	});

	const result = await actions.create({
		locals: {
			pool: { connect },
			user: { guid: userId, isAuthenticated: true }
		},
		request
	} as never);

	expect(insertMcpToken).toHaveBeenCalledExactlyOnceWith({
		name: 'Claude',
		prefix: 'mcp_pat_example',
		scopes: ['containers:read', 'organizations:read'],
		secretHash: Buffer.from('hash'),
		userId
	});
	expect(connect).toHaveBeenCalledExactlyOnceWith(databaseOperation);
	expect(result).toEqual({ action: 'create', createdToken: `mcp_pat_${'a'.repeat(43)}` });
});

test('adds the container write scope when explicitly selected', async () => {
	const connect = vi.fn().mockResolvedValue(undefined);
	const request = new Request('http://localhost/me/settings/tokens?/create', {
		body: new URLSearchParams({ containersWrite: 'true', name: 'Claude write access' }),
		method: 'POST'
	});

	await actions.create({
		locals: {
			pool: { connect },
			user: { guid: userId, isAuthenticated: true }
		},
		request
	} as never);

	expect(insertMcpToken).toHaveBeenCalledExactlyOnceWith({
		name: 'Claude write access',
		prefix: 'mcp_pat_example',
		scopes: ['containers:read', 'organizations:read', 'containers:write'],
		secretHash: Buffer.from('hash'),
		userId
	});
});

test('adds the user read scope when explicitly selected', async () => {
	const connect = vi.fn().mockResolvedValue(undefined);
	const request = new Request('http://localhost/me/settings/tokens?/create', {
		body: new URLSearchParams({ name: 'Claude user lookup', usersRead: 'true' }),
		method: 'POST'
	});

	await actions.create({
		locals: {
			pool: { connect },
			user: { guid: userId, isAuthenticated: true }
		},
		request
	} as never);

	expect(insertMcpToken).toHaveBeenCalledExactlyOnceWith({
		name: 'Claude user lookup',
		prefix: 'mcp_pat_example',
		scopes: ['containers:read', 'organizations:read', 'users:read'],
		secretHash: Buffer.from('hash'),
		userId
	});
});
