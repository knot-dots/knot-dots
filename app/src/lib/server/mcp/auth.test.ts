import { OAuthErrorCode } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMcpTokenVerifier, mcpAuthExtra } from './auth';
import { mcpResourceUrl } from './oauth';

const token = `mcp_pat_${'a'.repeat(43)}`;
const tokenId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';
const expiresAt = new Date(Date.now() + 60_000);
const connect = vi.fn();
const jwks = vi.fn();
const verifier = createMcpTokenVerifier({ connect } as never, { jwks: () => jwks });

beforeEach(() => {
	connect.mockReset();
	jwks.mockReset();
});

describe('MCP token verifier', () => {
	test('returns SDK auth information for a valid token', async () => {
		connect.mockResolvedValue({
			expires_at: expiresAt,
			id: tokenId,
			scopes: ['organizations:read'],
			user_id: userId
		});

		await expect(verifier.verifyAccessToken(token)).resolves.toEqual({
			clientId: tokenId,
			expiresAt: Math.floor(expiresAt.getTime() / 1000),
			extra: { tokenId, userId },
			resource: mcpResourceUrl(),
			scopes: ['organizations:read'],
			token
		});
		expect(connect).toHaveBeenCalledOnce();
	});

	test('rejects a malformed personal token without querying the database', async () => {
		await expect(verifier.verifyAccessToken('mcp_pat_too-short')).rejects.toMatchObject({
			code: OAuthErrorCode.InvalidToken
		});
		expect(connect).not.toHaveBeenCalled();
	});

	test('treats tokens without the personal token prefix as Keycloak access tokens', async () => {
		await expect(verifier.verifyAccessToken('not-an-mcp-token')).rejects.toMatchObject({
			code: OAuthErrorCode.InvalidToken
		});
		expect(connect).not.toHaveBeenCalled();
	});

	test('rejects a token not accepted by the database', async () => {
		connect.mockResolvedValue(null);

		await expect(verifier.verifyAccessToken(token)).rejects.toMatchObject({
			code: OAuthErrorCode.InvalidToken
		});
	});

	test('does not turn database failures into credential failures', async () => {
		const databaseError = new Error('database unavailable');
		connect.mockRejectedValue(databaseError);

		await expect(verifier.verifyAccessToken(token)).rejects.toBe(databaseError);
	});
});

describe('MCP auth context', () => {
	test.each([
		['a personal token', { tokenId, userId }],
		['an OAuth client', { clientId: 'knot-dots-mcp', userId }]
	])('accepts %s', (_, extra) => {
		expect(mcpAuthExtra.safeParse(extra).success).toBe(true);
	});

	test.each([
		['neither', { userId }],
		['both', { clientId: 'knot-dots-mcp', tokenId, userId }]
	])('rejects %s of token and client', (_, extra) => {
		expect(mcpAuthExtra.safeParse(extra).success).toBe(false);
	});
});
