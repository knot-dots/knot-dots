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
const writeScopedAuthInfo = {
	...authInfo,
	extra: { tokenId, userId },
	scopes: ['containers:write']
};
const userScopedAuthInfo = {
	...authInfo,
	extra: { tokenId, userId },
	scopes: ['users:read']
};
const addCustomCollectionSection = vi.fn();
const createPage = vi.fn();
const getContainer = vi.fn();
const listContainerCategories = vi.fn();
const listContainerCategoryValues = vi.fn();
const listOrganizationalUnits = vi.fn();
const listOrganizationMemberships = vi.fn();
const searchContainers = vi.fn();
const searchOrganizationUsers = vi.fn();
const toolHandler = createKnotDotsMcpHandler({
	addCustomCollectionSection,
	createPage,
	getContainer,
	listContainerCategories,
	listContainerCategoryValues,
	listOrganizationalUnits,
	listOrganizationMemberships,
	searchContainers,
	searchOrganizationUsers
});

const modernProtocolVersion = '2026-07-28';

function request(body: object, headers: HeadersInit = {}) {
	return new Request('http://localhost/mcp', {
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json', ...headers },
		method: 'POST'
	});
}

function modernRequest(method: string, params: Record<string, unknown> = {}) {
	const headers: HeadersInit = {
		'Mcp-Method': method,
		'Mcp-Protocol-Version': modernProtocolVersion
	};
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
					[PROTOCOL_VERSION_META_KEY]: modernProtocolVersion
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
	addCustomCollectionSection.mockReset();
	createPage.mockReset();
	getContainer.mockReset();
	listContainerCategories.mockReset();
	listContainerCategoryValues.mockReset();
	listOrganizationalUnits.mockReset();
	listOrganizationMemberships.mockReset();
	searchContainers.mockReset();
	searchOrganizationUsers.mockReset();
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
						[PROTOCOL_VERSION_META_KEY]: modernProtocolVersion
					}
				}
			},
			{ 'Mcp-Method': 'server/discover', 'Mcp-Protocol-Version': modernProtocolVersion }
		),
		{ authInfo }
	);

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toMatchObject({
		id: 1,
		jsonrpc: '2.0',
		result: { supportedVersions: [modernProtocolVersion] }
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
				name: 'get_container',
				title: 'Get container'
			}),
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
			}),
			expect.objectContaining({
				name: 'list_container_categories',
				title: 'List container categories'
			}),
			expect.objectContaining({
				name: 'list_container_category_values',
				title: 'List container category values'
			}),
			expect.objectContaining({
				name: 'search_organization_users',
				title: 'Search organization users'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: false,
					openWorldHint: false,
					readOnlyHint: false
				},
				name: 'create_page',
				title: 'Create page'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: false,
					openWorldHint: false,
					readOnlyHint: false
				},
				name: 'add_custom_collection_section',
				title: 'Add custom collection section'
			})
		])
	);
	expect(
		body.result.tools.find(({ name }: { name: string }) => name === 'search_containers')
	).toMatchObject({
		inputSchema: {
			properties: {
				assigneeGuids: { items: { type: 'string' }, type: 'array' }
			}
		}
	});
});

test('lists container categories using the read scope', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const output = {
		categories: [
			{
				applicableTypes: ['indicator_template'],
				key: 'sdg',
				label: 'Sustainable Development Goal',
				valueCount: 186
			}
		]
	};
	listContainerCategories.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid, types: ['indicator_template'] },
			name: 'list_container_categories'
		}),
		{ authInfo: containerScopedAuthInfo }
	);

	expect(listContainerCategories).toHaveBeenCalledExactlyOnceWith(userId, {
		organizationGuid,
		types: ['indicator_template']
	});
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

test('lists a bounded page of category values using the read scope', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const output = {
		category: { key: 'sdg', label: 'Sustainable Development Goal' },
		nextOffset: null,
		values: [{ label: 'Climate action', parentValue: null, value: '13' }]
	};
	listContainerCategoryValues.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: {
				categoryKey: 'sdg',
				organizationGuid,
				terms: 'climate',
				types: ['indicator_template']
			},
			name: 'list_container_category_values'
		}),
		{ authInfo: containerScopedAuthInfo }
	);

	expect(listContainerCategoryValues).toHaveBeenCalledExactlyOnceWith(userId, {
		categoryKey: 'sdg',
		limit: 50,
		offset: 0,
		organizationGuid,
		terms: 'climate',
		types: ['indicator_template']
	});
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

test('searches organization users with the dedicated scope', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const output = {
		nextOffset: null,
		users: [{ guid: userId, name: 'Niels Example' }]
	};
	searchOrganizationUsers.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid, terms: 'Niels' },
			name: 'search_organization_users'
		}),
		{ authInfo: userScopedAuthInfo }
	);

	expect(searchOrganizationUsers).toHaveBeenCalledExactlyOnceWith(userId, {
		limit: 50,
		offset: 0,
		organizationGuid,
		terms: 'Niels'
	});
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

test('denies user lookup without its dedicated scope', async () => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid: '00000000-0000-4000-8000-000000000003' },
			name: 'search_organization_users'
		}),
		{ authInfo: containerScopedAuthInfo }
	);

	expect(searchOrganizationUsers).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Missing required scope: users:read', type: 'text' }],
			isError: true
		}
	});
});

test('denies the category tool without the container read scope', async () => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: {
				organizationGuid: '00000000-0000-4000-8000-000000000003'
			},
			name: 'list_container_categories'
		}),
		{ authInfo: scopedAuthInfo }
	);

	expect(listContainerCategories).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Missing required scope: containers:read', type: 'text' }],
			isError: true
		}
	});
});

test('creates a page with defaults using the write scope', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const output = {
		page: {
			guid: '00000000-0000-4000-8000-000000000004',
			organizationGuid,
			organizationalUnitGuid: null,
			title: 'Climate indicators',
			visibility: 'organization'
		}
	};
	createPage.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { organizationGuid, title: 'Climate indicators' },
			name: 'create_page'
		}),
		{ authInfo: writeScopedAuthInfo }
	);

	expect(createPage).toHaveBeenCalledExactlyOnceWith(userId, {
		body: '',
		organizationGuid,
		organizationalUnitGuid: null,
		title: 'Climate indicators',
		visibility: 'organization'
	});
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

test('adds a custom collection section with categories using the write scope', async () => {
	const pageGuid = '00000000-0000-4000-8000-000000000003';
	const input = {
		categories: { sdg: ['13'] },
		includeSubordinateOrganizationalUnits: true,
		pageGuid,
		title: 'Objekte einbinden',
		types: ['indicator_template']
	};
	const output = {
		section: {
			...input,
			guid: '00000000-0000-4000-8000-000000000004'
		}
	};
	addCustomCollectionSection.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: {
				categories: { sdg: ['13'] },
				pageGuid,
				title: 'Objekte einbinden',
				types: ['indicator_template']
			},
			name: 'add_custom_collection_section'
		}),
		{ authInfo: writeScopedAuthInfo }
	);

	expect(addCustomCollectionSection).toHaveBeenCalledExactlyOnceWith(userId, input);
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

test.each([
	[
		'create_page',
		createPage,
		{
			organizationGuid: '00000000-0000-4000-8000-000000000003',
			title: 'Climate indicators'
		}
	],
	[
		'add_custom_collection_section',
		addCustomCollectionSection,
		{
			pageGuid: '00000000-0000-4000-8000-000000000003',
			title: 'Objekte einbinden',
			types: ['indicator_template']
		}
	]
])('denies the %s tool without the write scope', async (name, dependency, arguments_) => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', { arguments: arguments_, name }),
		{ authInfo: containerScopedAuthInfo }
	);

	expect(dependency).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Missing required scope: containers:write', type: 'text' }],
			isError: true
		}
	});
});

test('searches visible containers with defaults for the authenticated token owner', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const output = {
		containers: [
			{
				assigneeGuids: [],
				creatorGuids: [],
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

test('gets a complete visible container', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const guid = '00000000-0000-4000-8000-000000000004';
	const container = {
		guid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload: {
			aiContribution: 0,
			aiSuggestion: false,
			category: {},
			chapterType: [],
			level: 'level.local',
			pdf: [],
			programType: 'program_type.misc',
			status: 'status.idea',
			template: false,
			title: 'Climate plan',
			type: 'program',
			visibility: 'organization'
		},
		realm: 'test',
		relation: [],
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-09-22T00:00:00.000Z')
	};
	getContainer.mockResolvedValue(container);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', { arguments: { guid }, name: 'get_container' }),
		{ authInfo: containerScopedAuthInfo }
	);

	expect(getContainer).toHaveBeenCalledExactlyOnceWith(userId, guid);
	await expect(response.json()).resolves.toMatchObject({
		result: {
			structuredContent: {
				container: expect.objectContaining({
					guid,
					payload: expect.objectContaining({ type: 'program' })
				})
			}
		}
	});
});

test('denies the container detail tool without its scope', async () => {
	const guid = '00000000-0000-4000-8000-000000000004';

	const response = await toolHandler.fetch(
		modernRequest('tools/call', { arguments: { guid }, name: 'get_container' }),
		{ authInfo: scopedAuthInfo }
	);

	expect(getContainer).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Missing required scope: containers:read', type: 'text' }],
			isError: true
		}
	});
});

test('does not distinguish a missing container from an inaccessible container', async () => {
	const guid = '00000000-0000-4000-8000-000000000004';
	getContainer.mockResolvedValue(null);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', { arguments: { guid }, name: 'get_container' }),
		{ authInfo: containerScopedAuthInfo }
	);

	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Container not found.', type: 'text' }],
			isError: true
		}
	});
});

test('does not expose container query failures to MCP clients', async () => {
	const guid = '00000000-0000-4000-8000-000000000004';
	getContainer.mockRejectedValue(new Error('database connection details'));

	const response = await toolHandler.fetch(
		modernRequest('tools/call', { arguments: { guid }, name: 'get_container' }),
		{ authInfo: containerScopedAuthInfo }
	);

	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Unable to get container.', type: 'text' }],
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
