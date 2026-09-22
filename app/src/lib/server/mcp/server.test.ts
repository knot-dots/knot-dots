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
const containerScopedAuthInfo = {
	...authInfo,
	extra: { tokenId, userId },
	scopes: ['containers:read']
};
const listOrganizationalUnits = vi.fn();
const listOrganizationMemberships = vi.fn();
const searchContainers = vi.fn();
const toolHandler = createKnotDotsMcpHandler({
	listOrganizationalUnits,
	listOrganizationMemberships,
	searchContainers
});

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

async function legacyResponseJson(response: Response) {
	expect(response.headers.get('content-type')).toContain('text/event-stream');
	const data = (await response.text()).split('\n').find((line) => line.startsWith('data: '));
	expect(data).toBeDefined();
	return JSON.parse(data!.slice('data: '.length));
}

beforeEach(() => {
	listOrganizationalUnits.mockReset();
	listOrganizationMemberships.mockReset();
	searchContainers.mockReset();
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

test('serves a legacy initialize request', async () => {
	const response = await mcpHandler.fetch(
		request(
			{
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					capabilities: {},
					clientInfo: { name: 'legacy-client', version: '1.0.0' },
					protocolVersion: '2025-11-25'
				}
			},
			{
				Accept: 'application/json, text/event-stream',
				'Mcp-Protocol-Version': '2025-11-25'
			}
		),
		{ authInfo }
	);

	expect(response.status).toBe(200);
	expect(await legacyResponseJson(response)).toMatchObject({
		id: 1,
		jsonrpc: '2.0',
		result: {
			protocolVersion: '2025-11-25',
			serverInfo: { name: '@knot-dots/app' }
		}
	});
});

test('serves tools to legacy clients with the request authentication context', async () => {
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
		request(
			{
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: { arguments: {}, name: 'list_my_organizations' }
			},
			{
				Accept: 'application/json, text/event-stream',
				'Mcp-Protocol-Version': '2025-11-25'
			}
		),
		{ authInfo: scopedAuthInfo }
	);

	expect(response.status).toBe(200);
	expect(listOrganizationMemberships).toHaveBeenCalledExactlyOnceWith(userId);
	expect(await legacyResponseJson(response)).toMatchObject({
		id: 1,
		jsonrpc: '2.0',
		result: {
			content: [{ text: JSON.stringify({ organizations }), type: 'text' }],
			structuredContent: { organizations }
		}
	});
});

test('advertises tools without requiring their scopes', async () => {
	const response = await toolHandler.fetch(modernRequest('tools/list'), { authInfo });

	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body).toMatchObject({ id: 1, jsonrpc: '2.0' });
	expect(body.result.tools).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				annotations: {
					idempotentHint: true,
					openWorldHint: false,
					readOnlyHint: true
				},
				name: 'list_organizational_units',
				title: 'List organizational units'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: true,
					openWorldHint: false,
					readOnlyHint: true
				},
				name: 'list_my_organizations',
				title: 'List my organizations'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: true,
					openWorldHint: false,
					readOnlyHint: true
				},
				name: 'search_containers',
				title: 'Search containers'
			})
		])
	);
});

test('searches visible containers with defaults for the authenticated token owner', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const output = {
		containers: [
			{
				guid: '00000000-0000-4000-8000-000000000004',
				label: 'Climate plan',
				organizationGuid,
				organizationalUnitGuid: null,
				status: 'status.idea',
				summary: 'A short summary',
				type: 'program'
			}
		],
		nextOffset: null
	};
	searchContainers.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { assigneeGuids: [userId], organizationGuid, terms: 'climate' },
			name: 'search_containers'
		}),
		{ authInfo: containerScopedAuthInfo }
	);

	expect(searchContainers).toHaveBeenCalledExactlyOnceWith(userId, {
		assigneeGuids: [userId],
		limit: 50,
		offset: 0,
		organizationGuid,
		statuses: [],
		terms: 'climate',
		types: []
	});
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: JSON.stringify(output), type: 'text' }],
			structuredContent: output
		}
	});
});

test('denies the container search tool without its scope', async () => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid: '00000000-0000-4000-8000-000000000003' },
			name: 'search_containers'
		}),
		{ authInfo: scopedAuthInfo }
	);

	expect(searchContainers).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Missing required scope: containers:read', type: 'text' }],
			isError: true
		}
	});
});

test('does not expose container search failures to MCP clients', async () => {
	searchContainers.mockRejectedValue(new Error('Elasticsearch connection details'));

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid: '00000000-0000-4000-8000-000000000003' },
			name: 'search_containers'
		}),
		{ authInfo: containerScopedAuthInfo }
	);

	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Unable to search containers.', type: 'text' }],
			isError: true
		}
	});
});

test('lists visible organizational units in the requested organization', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const output = {
		nextOffset: null,
		organizationalUnits: [
			{
				guid: '00000000-0000-4000-8000-000000000004',
				level: 1,
				name: 'Anytown administration',
				organizationGuid,
				slug: 'administration'
			}
		]
	};
	listOrganizationalUnits.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid },
			name: 'list_organizational_units'
		}),
		{ authInfo: scopedAuthInfo }
	);

	expect(response.status).toBe(200);
	expect(listOrganizationalUnits).toHaveBeenCalledExactlyOnceWith(userId, {
		limit: 50,
		offset: 0,
		organizationGuid
	});
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: JSON.stringify(output), type: 'text' }],
			structuredContent: output
		}
	});
});

test('denies the organizational-unit tool without its scope', async () => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid: '00000000-0000-4000-8000-000000000003' },
			name: 'list_organizational_units'
		}),
		{ authInfo: { ...authInfo, extra: { tokenId, userId } } }
	);

	expect(listOrganizationalUnits).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Missing required scope: organizations:read', type: 'text' }],
			isError: true
		}
	});
});

test('does not expose organizational-unit query failures to MCP clients', async () => {
	listOrganizationalUnits.mockRejectedValue(new Error('database connection details'));

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid: '00000000-0000-4000-8000-000000000003' },
			name: 'list_organizational_units'
		}),
		{ authInfo: scopedAuthInfo }
	);

	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Unable to list organizational units.', type: 'text' }],
			isError: true
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
