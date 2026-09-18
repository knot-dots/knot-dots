import {
	CLIENT_CAPABILITIES_META_KEY,
	CLIENT_INFO_META_KEY,
	PROTOCOL_VERSION_META_KEY
} from '@modelcontextprotocol/server';
import { expect, test } from 'vitest';
import { mcpHandler } from './server';

const authInfo = {
	clientId: '00000000-0000-4000-8000-000000000001',
	expiresAt: Math.floor(Date.now() / 1000) + 60,
	scopes: [],
	token: `mcp_pat_${'a'.repeat(43)}`
};

function request(body: object, headers: HeadersInit = {}) {
	return new Request('http://localhost/mcp', {
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json', ...headers },
		method: 'POST'
	});
}

test('serves a modern MCP discovery request', async () => {
	const response = await mcpHandler.fetch(
		request(
			{
				jsonrpc: '2.0',
				id: 1,
				method: 'server/discover',
				params: {
					_meta: {
						[CLIENT_CAPABILITIES_META_KEY]: {},
						[CLIENT_INFO_META_KEY]: { name: 'test-client', version: '1.0.0' },
						[PROTOCOL_VERSION_META_KEY]: '2026-07-28'
					}
				}
			},
			{ 'Mcp-Method': 'server/discover' }
		),
		{ authInfo }
	);

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toMatchObject({
		id: 1,
		jsonrpc: '2.0',
		result: { supportedVersions: ['2026-07-28'] }
	});
});

test('rejects a legacy initialize request', async () => {
	const response = await mcpHandler.fetch(
		request({
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: {
				capabilities: {},
				clientInfo: { name: 'legacy-client', version: '1.0.0' },
				protocolVersion: '2025-11-25'
			}
		}),
		{ authInfo }
	);

	expect(response.status).toBe(400);
});
