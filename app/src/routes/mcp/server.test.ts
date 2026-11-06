import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mcpResourceMetadataUrl, mcpResourceUrl } from '$lib/server/mcp/oauth';

const verifyAccessToken = vi.hoisted(() => vi.fn());
const fetchMcp = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mcp/auth', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/mcp/auth')>()),
	createMcpTokenVerifier: () => ({ verifyAccessToken })
}));
vi.mock('$lib/server/mcp/server', () => ({
	mcpHandler: { fetch: fetchMcp }
}));

import { POST } from './+server';

const token = `mcp_pat_${'a'.repeat(43)}`;
const userId = '00000000-0000-4000-8000-000000000002';
const authInfo = {
	clientId: '00000000-0000-4000-8000-000000000001',
	expiresAt: Math.floor(Date.now() / 1000) + 60,
	extra: {
		tokenId: '00000000-0000-4000-8000-000000000001',
		userId
	},
	resource: mcpResourceUrl(),
	scopes: [],
	token
};
const oauthAuthInfo = {
	...authInfo,
	clientId: 'knot-dots-mcp',
	extra: { clientId: 'knot-dots-mcp', userId },
	token: 'header.payload.signature'
};

function post(headers: HeadersInit = {}, features = ['McpServer']) {
	const request = new Request('http://localhost:5173/mcp', {
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'server/discover' }),
		headers: { 'Content-Type': 'application/json', Host: 'localhost:5173', ...headers },
		method: 'POST'
	});

	return POST({ locals: { features, pool: { connect } }, request } as never);
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

test('points unauthenticated clients to the protected resource metadata', async () => {
	const response = await post();

	expect(response.headers.get('www-authenticate')).toContain(
		`resource_metadata="${mcpResourceMetadataUrl()}"`
	);
});

test('names the scopes to request on connect, without the user scope', async () => {
	const response = await post();

	expect(response.headers.get('www-authenticate')).toContain(
		'scope="containers:read containers:write organizations:read"'
	);
});

test('does not require the connect scopes from personal tokens', async () => {
	verifyAccessToken.mockResolvedValue({ ...authInfo, scopes: ['containers:read'] });

	const response = await post({ Authorization: `Bearer ${token}` });

	expect(response.status).toBe(200);
});

test('rejects an invalid bearer token', async () => {
	verifyAccessToken.mockRejectedValue(
		new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid access token')
	);

	const response = await post({ Authorization: `Bearer ${token}` });

	expect(response.status).toBe(401);
	expect(fetchMcp).not.toHaveBeenCalled();
});

test('rejects a token issued for another resource', async () => {
	verifyAccessToken.mockResolvedValue({
		...authInfo,
		resource: new URL('https://elsewhere.example/mcp')
	});

	const response = await post({ Authorization: `Bearer ${token}` });

	expect(response.status).toBe(401);
	expect(fetchMcp).not.toHaveBeenCalled();
});

test('passes validated auth information to the MCP handler', async () => {
	const response = await post({ Authorization: `Bearer ${token}` });

	expect(response.status).toBe(200);
	expect(fetchMcp).toHaveBeenCalledWith(expect.any(Request), {
		authInfo: { ...authInfo, resourceMetadataUrl: mcpResourceMetadataUrl() }
	});
	// Personal tokens can only be created by users who may use MCP.
	expect(connect).not.toHaveBeenCalled();
});

describe('OAuth access tokens', () => {
	beforeEach(() => {
		verifyAccessToken.mockResolvedValue(oauthAuthInfo);
	});

	test('are accepted for users with the MCP flag', async () => {
		connect.mockResolvedValue({ guid: userId, settings: { features: ['MCP'] } });

		const response = await post({ Authorization: 'Bearer header.payload.signature' });

		expect(response.status).toBe(200);
		expect(fetchMcp).toHaveBeenCalledOnce();
	});

	test('are refused for users without the MCP flag', async () => {
		connect.mockResolvedValue({ guid: userId, settings: {} });

		const response = await post({ Authorization: 'Bearer header.payload.signature' });

		expect(response.status).toBe(403);
		expect(response.headers.get('www-authenticate')).toBeNull();
		expect(fetchMcp).not.toHaveBeenCalled();
	});

	test('are refused for users who have never signed in to knot dots', async () => {
		connect.mockResolvedValue(null);

		const response = await post({ Authorization: 'Bearer header.payload.signature' });

		expect(response.status).toBe(403);
		expect(fetchMcp).not.toHaveBeenCalled();
	});
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

test('does not answer unless the deployment enables the MCP server', async () => {
	const response = await post({ Authorization: `Bearer ${token}` }, ['MCP']);

	expect(response.status).toBe(404);
	expect(verifyAccessToken).not.toHaveBeenCalled();
	expect(fetchMcp).not.toHaveBeenCalled();
});
