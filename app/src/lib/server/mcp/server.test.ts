import {
	CLIENT_CAPABILITIES_META_KEY,
	CLIENT_INFO_META_KEY,
	PROTOCOL_VERSION_META_KEY
} from '@modelcontextprotocol/server';
import { beforeEach, expect, test, vi } from 'vitest';
import { createKnotDotsMcpHandler, mcpHandler } from './server';

const userId = '00000000-0000-4000-8000-000000000002';
const tokenId = '00000000-0000-4000-8000-000000000001';
const authInfo = {
	clientId: tokenId,
	expiresAt: Math.floor(Date.now() / 1000) + 60,
	scopes: [],
	token: `mcp_pat_${'a'.repeat(43)}`
};
const scopedAuthInfo = {
	...authInfo,
	extra: { tokenId, userId },
	scopes: ['organizations:read']
};
const listOrganizationMemberships = vi.fn();
const toolHandler = createKnotDotsMcpHandler({ listOrganizationMemberships });

function request(body: object, headers: HeadersInit = {}) {
	return new Request('http://localhost/mcp', {
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json', ...headers },
		method: 'POST'
	});
}

function modernRequest(method: string, params: Record<string, unknown> = {}) {
	const headers: HeadersInit = { 'Mcp-Method': method };
	if (typeof params.name === 'string') {
		headers['Mcp-Name'] = params.name;
	}

	return request(
		{
			jsonrpc: '2.0',
			id: 1,
			method,
			params: {
				...params,
				_meta: {
					[CLIENT_CAPABILITIES_META_KEY]: {},
					[PROTOCOL_VERSION_META_KEY]: '2026-07-28'
				}
			}
		},
		headers
	);
}

beforeEach(() => {
	listOrganizationMemberships.mockReset();
});

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

test('advertises the organization tool without requiring its scope', async () => {
	const response = await toolHandler.fetch(modernRequest('tools/list'), { authInfo });

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toMatchObject({
		result: {
			tools: [
				{
					annotations: {
						idempotentHint: true,
						openWorldHint: false,
						readOnlyHint: true
					},
					name: 'list_my_organizations',
					title: 'List my organizations'
				}
			]
		}
	});
});

test('lists organizations for the authenticated token owner', async () => {
	const organizations = [
		{
			guid: '00000000-0000-4000-8000-000000000003',
			name: 'Anytown',
			role: 'administrator',
			slug: 'anytown'
		}
	];
	listOrganizationMemberships.mockResolvedValue(organizations);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: {},
			name: 'list_my_organizations'
		}),
		{ authInfo: scopedAuthInfo }
	);

	expect(response.status).toBe(200);
	expect(listOrganizationMemberships).toHaveBeenCalledExactlyOnceWith(userId);
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: JSON.stringify({ organizations }), type: 'text' }],
			structuredContent: { organizations }
		}
	});
});

test('denies the organization tool without its scope', async () => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: {},
			name: 'list_my_organizations'
		}),
		{ authInfo: { ...authInfo, extra: { userId } } }
	);

	expect(listOrganizationMemberships).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Missing required scope: organizations:read', type: 'text' }],
			isError: true
		}
	});
});

test('rejects an invalid authentication context before querying', async () => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: {},
			name: 'list_my_organizations'
		}),
		{ authInfo: { ...scopedAuthInfo, extra: {} } }
	);

	expect(listOrganizationMemberships).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Invalid authentication context.', type: 'text' }],
			isError: true
		}
	});
});

test('does not expose database failures to MCP clients', async () => {
	listOrganizationMemberships.mockRejectedValue(new Error('database connection details'));

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: {},
			name: 'list_my_organizations'
		}),
		{ authInfo: scopedAuthInfo }
	);

	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Unable to list organizations.', type: 'text' }],
			isError: true
		}
	});
});
