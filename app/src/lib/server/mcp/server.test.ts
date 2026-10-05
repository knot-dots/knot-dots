import {
	CLIENT_CAPABILITIES_META_KEY,
	CLIENT_INFO_META_KEY,
	PROTOCOL_VERSION_META_KEY
} from '@modelcontextprotocol/server';
import { beforeEach, expect, test, vi } from 'vitest';
import type { AnyPayload, Container } from '$lib/models';
import { mcpPayloadTypeValues } from '$lib/server/mcp/contracts/payloads';
import { payloadSchemaCatalogUri } from '$lib/server/mcp/resources/payloadSchemas';
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
const addContainerRelation = vi.fn();
const addCustomCollectionSection = vi.fn();
const attachIndicator = vi.fn();
const createContainer = vi.fn();
const getContainer = vi.fn();
const listContainerCategories = vi.fn();
const listContainerCategoryValues = vi.fn();
const listContainerRelations = vi.fn();
const listOrganizationalUnits = vi.fn();
const listOrganizationMemberships = vi.fn();
const removeContainerRelation = vi.fn();
const setActualData = vi.fn();
const searchContainers = vi.fn();
const searchOrganizationUsers = vi.fn();
const updateContainer = vi.fn();
const toolHandler = createKnotDotsMcpHandler({
	addContainerRelation,
	addCustomCollectionSection,
	attachIndicator,
	createContainer,
	getContainer,
	listContainerCategories,
	listContainerCategoryValues,
	listContainerRelations,
	listOrganizationalUnits,
	listOrganizationMemberships,
	removeContainerRelation,
	setActualData,
	searchContainers,
	searchOrganizationUsers,
	updateContainer
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
	if (typeof params.uri === 'string') {
		headers['Mcp-Name'] = params.uri;
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
	addContainerRelation.mockReset();
	addCustomCollectionSection.mockReset();
	attachIndicator.mockReset();
	createContainer.mockReset();
	updateContainer.mockReset();
	getContainer.mockReset();
	listContainerCategories.mockReset();
	listContainerCategoryValues.mockReset();
	listContainerRelations.mockReset();
	listOrganizationalUnits.mockReset();
	listOrganizationMemberships.mockReset();
	removeContainerRelation.mockReset();
	setActualData.mockReset();
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
				annotations: {
					idempotentHint: true,
					openWorldHint: false,
					readOnlyHint: true
				},
				name: 'list_container_relations',
				title: 'List container relations'
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
				name: 'create_container',
				title: 'Create container'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: false,
					openWorldHint: false,
					readOnlyHint: false
				},
				name: 'add_custom_collection_section',
				title: 'Add custom collection section'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: true,
					openWorldHint: false,
					readOnlyHint: false
				},
				name: 'add_container_relation',
				title: 'Add container relation'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: true,
					openWorldHint: false,
					readOnlyHint: false
				},
				name: 'attach_indicator',
				title: 'Attach indicator'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: true,
					openWorldHint: false,
					readOnlyHint: false
				},
				name: 'remove_container_relation',
				title: 'Remove container relation'
			}),
			expect.objectContaining({
				annotations: {
					idempotentHint: false,
					openWorldHint: false,
					readOnlyHint: false
				},
				name: 'update_container',
				title: 'Update container'
			})
		])
	);
	expect(body.result.tools.map(({ name }: { name: string }) => name).toSorted()).toEqual([
		'add_container_relation',
		'add_custom_collection_section',
		'attach_indicator',
		'create_container',
		'get_container',
		'list_container_categories',
		'list_container_category_values',
		'list_container_relations',
		'list_my_organizations',
		'list_organizational_units',
		'remove_container_relation',
		'search_containers',
		'search_organization_users',
		'set_actual_data',
		'update_container'
	]);
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

test('lists container relations using the read scope', async () => {
	const guid = '00000000-0000-4000-8000-000000000003';
	const output = {
		nextOffset: null,
		relations: [
			{
				container: {
					assigneeGuids: [],
					creatorGuids: [],
					guid: '00000000-0000-4000-8000-000000000004',
					label: 'Climate goal',
					organizationGuid: '00000000-0000-4000-8000-000000000005',
					organizationalUnitGuid: null,
					status: null,
					summary: null,
					type: 'goal'
				},
				direction: 'outgoing',
				position: 0,
				predicate: 'contributes-to'
			}
		]
	};
	listContainerRelations.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { guid, predicates: ['contributes-to'] },
			name: 'list_container_relations'
		}),
		{ authInfo: containerScopedAuthInfo }
	);

	expect(listContainerRelations).toHaveBeenCalledExactlyOnceWith(userId, {
		guid,
		limit: 50,
		offset: 0,
		predicates: ['contributes-to']
	});
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

test('denies listing container relations without the container read scope', async () => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { guid: '00000000-0000-4000-8000-000000000003' },
			name: 'list_container_relations'
		}),
		{ authInfo: scopedAuthInfo }
	);

	expect(listContainerRelations).not.toHaveBeenCalled();
	await expect(response.json()).resolves.toMatchObject({
		result: {
			content: [{ text: 'Missing required scope: containers:read', type: 'text' }],
			isError: true
		}
	});
});

test('creates a container using the write scope', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const container = {
		guid: '00000000-0000-4000-8000-000000000004',
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		own_matrix: false,
		payload: { body: '', title: 'Climate indicators', type: 'page', visibility: 'organization' },
		realm: 'test',
		relation: [],
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-09-23T00:00:00.000Z')
	} as Container<AnyPayload>;
	createContainer.mockResolvedValue(container);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: {
				organizationGuid,
				payload: { body: '', title: 'Climate indicators', type: 'page' }
			},
			name: 'create_container'
		}),
		{ authInfo: writeScopedAuthInfo }
	);

	expect(createContainer).toHaveBeenCalledExactlyOnceWith(
		{ tokenId, userId },
		{
			organizationGuid,
			organizationalUnitGuid: null,
			parentRelations: [],
			payload: { body: '', title: 'Climate indicators', type: 'page' }
		}
	);
	await expect(response.json()).resolves.toMatchObject({
		result: {
			structuredContent: {
				container: { ...container, valid_from: '2026-09-23T00:00:00.000Z' }
			}
		}
	});
});

test('updates a container using the write scope', async () => {
	const organizationGuid = '00000000-0000-4000-8000-000000000003';
	const guid = '00000000-0000-4000-8000-000000000004';
	const container = {
		guid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		own_matrix: false,
		payload: { body: '', title: 'Renamed', type: 'page', visibility: 'organization' },
		realm: 'test',
		relation: [],
		revision: 3,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-09-24T00:00:00.000Z')
	} as Container<AnyPayload>;
	updateContainer.mockResolvedValue(container);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { expectedRevision: 2, guid, payloadPatch: { title: 'Renamed' } },
			name: 'update_container'
		}),
		{ authInfo: writeScopedAuthInfo }
	);

	expect(updateContainer).toHaveBeenCalledExactlyOnceWith(
		{ tokenId, userId },
		{ expectedRevision: 2, guid, payloadPatch: { title: 'Renamed' } }
	);
	await expect(response.json()).resolves.toMatchObject({
		result: {
			structuredContent: {
				container: { ...container, valid_from: '2026-09-24T00:00:00.000Z' }
			}
		}
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

	expect(addCustomCollectionSection).toHaveBeenCalledExactlyOnceWith({ tokenId, userId }, input);
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

const relationArguments = {
	objectGuid: '00000000-0000-4000-8000-000000000004',
	predicate: 'contributes-to',
	subjectGuid: '00000000-0000-4000-8000-000000000003'
};

test.each([
	['add_container_relation', addContainerRelation],
	['remove_container_relation', removeContainerRelation]
])('changes a relation with the %s tool using the write scope', async (name, dependency) => {
	const output = {
		changed: true,
		relation: relationArguments
	};
	dependency.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', { arguments: relationArguments, name }),
		{ authInfo: writeScopedAuthInfo }
	);

	expect(dependency).toHaveBeenCalledExactlyOnceWith({ tokenId, userId }, relationArguments);
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

test.each([
	['is-part-of', 'Set it with parentRelations of create_container.'],
	['is-measured-by', 'Use attach_indicator.'],
	['is-objective-for', 'Use attach_indicator.']
])('points from %s in the relation tools to the right tool', async (predicate, hint) => {
	const response = await toolHandler.fetch(
		modernRequest('tools/call', {
			arguments: { ...relationArguments, predicate },
			name: 'add_container_relation'
		}),
		{ authInfo: writeScopedAuthInfo }
	);

	expect(addContainerRelation).not.toHaveBeenCalled();
	const body = await response.json();
	expect(body).toMatchObject({ result: { isError: true } });
	expect(body.result.content[0].text).toContain(hint);
});

const setActualDataArguments = {
	indicatorGuid: '00000000-0000-4000-8000-000000000004',
	organizationGuid: '00000000-0000-4000-8000-000000000003',
	values: [{ value: 412, year: 2024 }]
};

test('sets actual data using the write scope', async () => {
	const output = {
		actualData: {
			booleanValue: false,
			guid: '00000000-0000-4000-8000-000000000005',
			indicatorGuid: setActualDataArguments.indicatorGuid,
			organizationGuid: setActualDataArguments.organizationGuid,
			organizationalUnitGuid: null,
			source: null,
			values: setActualDataArguments.values
		},
		created: true
	};
	setActualData.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', { arguments: setActualDataArguments, name: 'set_actual_data' }),
		{ authInfo: writeScopedAuthInfo }
	);

	expect(setActualData).toHaveBeenCalledExactlyOnceWith(
		{ tokenId, userId },
		{ ...setActualDataArguments, organizationalUnitGuid: null }
	);
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

const attachIndicatorArguments = {
	indicatorGuid: '00000000-0000-4000-8000-000000000004',
	targetGuid: '00000000-0000-4000-8000-000000000003'
};

test('attaches an indicator using the write scope', async () => {
	const output = {
		attachment: {
			guid: '00000000-0000-4000-8000-000000000005',
			indicatorGuid: attachIndicatorArguments.indicatorGuid,
			targetGuid: attachIndicatorArguments.targetGuid,
			type: 'effect'
		},
		changed: true
	};
	attachIndicator.mockResolvedValue(output);

	const response = await toolHandler.fetch(
		modernRequest('tools/call', { arguments: attachIndicatorArguments, name: 'attach_indicator' }),
		{ authInfo: writeScopedAuthInfo }
	);

	expect(attachIndicator).toHaveBeenCalledExactlyOnceWith(
		{ tokenId, userId },
		attachIndicatorArguments
	);
	await expect(response.json()).resolves.toMatchObject({
		result: { structuredContent: output }
	});
});

test.each([
	[
		'create_container',
		createContainer,
		{
			organizationGuid: '00000000-0000-4000-8000-000000000003',
			payload: { body: '', title: 'Climate indicators', type: 'page' }
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
	],
	[
		'update_container',
		updateContainer,
		{
			expectedRevision: 1,
			guid: '00000000-0000-4000-8000-000000000003',
			payloadPatch: { title: 'Renamed' }
		}
	],
	['add_container_relation', addContainerRelation, relationArguments],
	['attach_indicator', attachIndicator, attachIndicatorArguments],
	['set_actual_data', setActualData, setActualDataArguments],
	['remove_container_relation', removeContainerRelation, relationArguments]
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

test('advertises the payload schema catalog and template', async () => {
	const resourcesResponse = await toolHandler.fetch(modernRequest('resources/list'), { authInfo });
	const templatesResponse = await toolHandler.fetch(modernRequest('resources/templates/list'), {
		authInfo
	});

	expect(resourcesResponse.status).toBe(200);
	await expect(resourcesResponse.json()).resolves.toMatchObject({
		result: {
			resources: [
				expect.objectContaining({
					mimeType: 'application/json',
					name: 'payload-schema-catalog',
					uri: payloadSchemaCatalogUri
				})
			]
		}
	});

	expect(templatesResponse.status).toBe(200);
	await expect(templatesResponse.json()).resolves.toMatchObject({
		result: {
			resourceTemplates: [
				expect.objectContaining({
					mimeType: 'application/schema+json',
					name: 'payload-schema',
					uriTemplate: `${payloadSchemaCatalogUri}/{type}`
				})
			]
		}
	});
});

test('serves a catalog containing exactly the curated payload schemas', async () => {
	const response = await toolHandler.fetch(
		modernRequest('resources/read', { uri: payloadSchemaCatalogUri }),
		{ authInfo }
	);

	expect(response.status).toBe(200);
	const body = await response.json();
	const content = body.result.contents[0];
	expect(content).toMatchObject({ mimeType: 'application/json', uri: payloadSchemaCatalogUri });
	expect(JSON.parse(content.text)).toEqual({
		description:
			'Canonical payload validation schemas exposed through MCP. Schema availability does not imply that an MCP creation tool is available.',
		payloads: mcpPayloadTypeValues.map((type) => ({
			type,
			uri: `${payloadSchemaCatalogUri}/${type}`
		})),
		schemaVersion: 1
	});
});

test('serves each curated payload as a direct JSON Schema', async () => {
	for (const payloadType of mcpPayloadTypeValues) {
		const uri = `${payloadSchemaCatalogUri}/${payloadType}`;
		const response = await toolHandler.fetch(modernRequest('resources/read', { uri }), {
			authInfo
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		const content = body.result.contents[0];
		expect(content).toMatchObject({ mimeType: 'application/schema+json', uri });
		const schema = JSON.parse(content.text);
		expect(schema).toMatchObject({
			$id: uri,
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			properties: { type: { const: payloadType, type: 'string' } },
			type: 'object'
		});
		expect(schema).not.toHaveProperty('anyOf');
		expect(schema).not.toHaveProperty('oneOf');
		for (const field of ['body', 'description']) {
			if (field in schema.properties) {
				expect(schema.properties[field]).toMatchObject({
					description: 'GitHub-flavored Markdown.',
					type: 'string'
				});
			}
		}
	}
});

test.each(['html', 'not_a_payload'])('does not expose the %s payload schema', async (type) => {
	const uri = `${payloadSchemaCatalogUri}/${type}`;
	const response = await toolHandler.fetch(modernRequest('resources/read', { uri }), { authInfo });

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toMatchObject({
		error: { code: -32602, data: { uri } },
		id: 1,
		jsonrpc: '2.0'
	});
});

test('completes only curated payload schema types', async () => {
	const response = await toolHandler.fetch(
		modernRequest('completion/complete', {
			argument: { name: 'type', value: 's' },
			ref: { type: 'ref/resource', uri: `${payloadSchemaCatalogUri}/{type}` }
		}),
		{ authInfo }
	);

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toMatchObject({
		result: { completion: { values: ['simple_measure'] } }
	});
});

test('serves payload schema resources to legacy clients', async () => {
	const uri = `${payloadSchemaCatalogUri}/task`;
	const response = await toolHandler.fetch(
		request(
			{
				jsonrpc: '2.0',
				id: 1,
				method: 'resources/read',
				params: { uri }
			},
			{
				Accept: 'application/json, text/event-stream',
				'Mcp-Protocol-Version': '2025-11-25'
			}
		),
		{ authInfo }
	);

	expect(response.status).toBe(200);
	const body = await legacyResponseJson(response);
	const content = body.result.contents[0];
	expect(content).toMatchObject({ mimeType: 'application/schema+json', uri });
	expect(JSON.parse(content.text)).toMatchObject({
		$id: uri,
		properties: { type: { const: 'task' } }
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
