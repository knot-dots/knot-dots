import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';
import { beforeEach, expect, test, vi } from 'vitest';

const verifyAccessToken = vi.hoisted(() => vi.fn());
const fetchMcp = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mcp/auth', () => ({
	createMcpTokenVerifier: () => ({ verifyAccessToken })
}));
vi.mock('$lib/server/mcp/server', () => ({
	mcpHandler: { fetch: fetchMcp }
}));

import { POST } from './+server';

const token = `mcp_pat_${'a'.repeat(43)}`;
const authInfo = {
	clientId: '00000000-0000-4000-8000-000000000001',
	expiresAt: Math.floor(Date.now() / 1000) + 60,
	extra: {
		tokenId: '00000000-0000-4000-8000-000000000001',
		userId: '00000000-0000-4000-8000-000000000002'
	},
	scopes: [],
	token
};

function post(headers: HeadersInit = {}) {
	const request = new Request('http://localhost:5173/mcp', {
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'server/discover' }),
		headers: { 'Content-Type': 'application/json', Host: 'localhost:5173', ...headers },
		method: 'POST'
	});

	return POST({ locals: { pool: {} }, request } as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	verifyAccessToken.mockResolvedValue(authInfo);
	fetchMcp.mockResolvedValue(new Response('{}', { status: 200 }));
});

test('rejects a request without bearer authentication', async () => {
	const response = await post();

	expect(response.status).toBe(401);
	expect(response.headers.get('www-authenticate')).toContain('Bearer');
	expect(fetchMcp).not.toHaveBeenCalled();
});

test('rejects an invalid bearer token', async () => {
	verifyAccessToken.mockRejectedValue(
		new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid access token')
	);

	const response = await post({ Authorization: `Bearer ${token}` });

	expect(response.status).toBe(401);
	expect(fetchMcp).not.toHaveBeenCalled();
});

test('passes validated auth information to the MCP handler', async () => {
	const response = await post({ Authorization: `Bearer ${token}` });

	expect(response.status).toBe(200);
	expect(fetchMcp).toHaveBeenCalledWith(expect.any(Request), { authInfo });
});

test('rejects a disallowed host before token verification', async () => {
	const response = await post({ Authorization: `Bearer ${token}`, Host: 'attacker.example' });

	expect(response.status).toBe(403);
	expect(verifyAccessToken).not.toHaveBeenCalled();
});

test('rejects a disallowed browser origin', async () => {
	const response = await post({
		Authorization: `Bearer ${token}`,
		Origin: 'https://attacker.example'
	});

	expect(response.status).toBe(403);
	expect(verifyAccessToken).not.toHaveBeenCalled();
});
