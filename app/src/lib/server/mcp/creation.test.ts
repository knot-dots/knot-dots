import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const mocks = vi.hoisted(() => ({
	categoryContext: {
		keys: ['sdg'],
		labels: new Map([['sdg', 'Sustainable Development Goal']]),
		objectTypesPerKey: { sdg: ['indicator_template'] },
		options: {
			sdg: [
				{
					guid: '00000000-0000-4000-8000-000000000008',
					label: 'Climate action',
					value: '13'
				}
			]
		}
	},
	containers: new Map<string, Container<AnyPayload>>(),
	createAuthorizedContainer: vi.fn(),
	recordMcpWriteEvent: vi.fn(),
	relations: [] as Array<{ object: string; position: number; predicate: string }>,
	transactionConnection: { transaction: true },
	unreadableGuids: new Set<string>(),
	unupdatableGuids: new Set<string>()
}));

function isDenied(action: string, subject: Container<AnyPayload>) {
	return (
		(action === 'read' && mocks.unreadableGuids.has(subject.guid)) ||
		(action === 'update' && mocks.unupdatableGuids.has(subject.guid))
	);
}

vi.mock('$lib/authorization', () => ({
	default: () => ({
		can: (action: string, subject: Container<AnyPayload>) => !isDenied(action, subject),
		cannot: isDenied
	})
}));
vi.mock('$lib/server/containerCreation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/containerCreation')>()),
	createAuthorizedContainer: mocks.createAuthorizedContainer
}));
vi.mock('$lib/server/db', () => ({
	getAllDirectContainerRelations: () => async () => mocks.relations,
	getContainerByGuid: (guid: string) => async () => mocks.containers.get(guid),
	getManyContainers:
		(_organizations: string[], { guid }: { guid: string[] }) =>
		async () =>
			guid.map((value) => mocks.containers.get(value)).filter(Boolean),
	recordMcpWriteEvent: (event: unknown) => async (connection: unknown) =>
		mocks.recordMcpWriteEvent(event, connection)
}));
vi.mock('$lib/server/features', () => ({ getFeatures: () => [] }));
vi.mock('$lib/server/mcp/categories', () => ({
	loadMcpCategoryContext: async () => mocks.categoryContext
}));
vi.mock('$lib/server/mcp/userContext', () => ({
	loadMcpUserContext: async (_connection: unknown, userId: string) => ({
		familyName: '',
		givenName: '',
		grants: emptyGrantRecords(),
		guid: userId,
		isAuthenticated: true,
		roles: [],
		settings: {}
	})
}));

import { createContainerInput } from '$lib/server/mcp/contracts/creation';
import { mcpPayloadTypeValues } from '$lib/server/mcp/contracts/payloads';
import {
	addMcpCustomCollectionSection,
	createMcpContainer,
	McpCreationError
} from '$lib/server/mcp/creation';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const pageGuid = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';
const createdGuid = '00000000-0000-4000-8000-000000000004';
const createdRevision = 11;
const tokenId = '00000000-0000-4000-8000-000000000009';
const parentGuid = '00000000-0000-4000-8000-000000000005';
const organizationalUnitGuid = '00000000-0000-4000-8000-000000000006';
const otherOrganizationGuid = '00000000-0000-4000-8000-000000000007';

function container(
	guid: string,
	payload: unknown,
	options: {
		organization?: string;
		organizationalUnit?: string | null;
		relation?: Array<{ object: string; position: number; predicate: string; subject: string }>;
	} = {}
): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: [options.organizationalUnit ?? options.organization ?? organizationGuid],
		organization: options.organization ?? organizationGuid,
		organizational_unit: options.organizationalUnit ?? null,
		payload,
		realm: 'test',
		relation: options.relation ?? [],
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-09-23T00:00:00.000Z')
	});
}

beforeEach(() => {
	mocks.containers.clear();
	mocks.containers.set(
		organizationGuid,
		container(organizationGuid, { name: 'Anytown', type: 'organization' })
	);
	mocks.containers.set(
		pageGuid,
		container(pageGuid, {
			body: '',
			title: 'Climate',
			type: 'page',
			visibility: 'organization'
		})
	);
	mocks.relations = [];
	mocks.unreadableGuids.clear();
	mocks.unupdatableGuids.clear();
	mocks.recordMcpWriteEvent.mockReset();
	mocks.createAuthorizedContainer.mockReset();
	mocks.createAuthorizedContainer.mockImplementation(({ afterCreate, data }) => async () => {
		const created = { ...data, guid: createdGuid, revision: createdRevision };
		await afterCreate?.(created, mocks.transactionConnection);
		return created;
	});
});

const payloadCases = [
	['page', { body: '', title: 'Created page', type: 'page' }],
	['program', { title: 'Created program', type: 'program' }],
	['goal', { title: 'Created goal', type: 'goal' }],
	['measure', { title: 'Created measure', type: 'measure' }],
	['simple_measure', { title: 'Created simple measure', type: 'simple_measure' }],
	['task', { title: 'Created task', type: 'task' }],
	['knowledge', { title: 'Created knowledge', type: 'knowledge' }],
	[
		'indicator_template',
		{ title: 'Created indicator', type: 'indicator_template', unit: 't CO2e' }
	],
	['resource_v2', { title: 'Created resource', type: 'resource_v2' }]
] as const;

test('covers every resource-backed payload type with a creation fixture', () => {
	expect(payloadCases.map(([type]) => type)).toEqual(mcpPayloadTypeValues);
});

test.each(payloadCases)(
	'creates a %s through the shared authorized service',
	async (_, payload) => {
		const input = createContainerInput.parse({ organizationGuid, payload });
		const created = await createMcpContainer({ ...input, tokenId, userId })({} as never);

		expect(created).toMatchObject({
			guid: createdGuid,
			payload: { title: payload.title, type: payload.type }
		});

		expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith({
			afterCreate: expect.any(Function),
			data: expect.objectContaining({
				managed_by: [organizationGuid],
				organization: organizationGuid,
				organizational_unit: null,
				payload: expect.objectContaining({ title: payload.title, type: payload.type }),
				relation: []
			}),
			features: [],
			user: expect.objectContaining({ guid: userId })
		});
		expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
			{
				containerGuid: createdGuid,
				revision: createdRevision,
				tokenId,
				tool: 'create_container',
				userId
			},
			mocks.transactionConnection
		);
	}
);

test('uses the organizational unit as owner when creating in a unit', async () => {
	mocks.containers.set(
		organizationalUnitGuid,
		container(organizationalUnitGuid, { name: 'Climate office', type: 'organizational_unit' })
	);
	const input = createContainerInput.parse({
		organizationGuid,
		organizationalUnitGuid,
		payload: { body: '', title: 'Unit page', type: 'page' }
	});

	await createMcpContainer({ ...input, tokenId, userId })({} as never);

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith({
		afterCreate: expect.any(Function),
		data: expect.objectContaining({
			managed_by: [organizationalUnitGuid],
			organizational_unit: organizationalUnitGuid
		}),
		features: [],
		user: expect.objectContaining({ guid: userId })
	});
});

test('appends structural parent relations using server-assigned positions', async () => {
	mocks.containers.set(
		parentGuid,
		container(
			parentGuid,
			{ title: 'Climate program', type: 'program' },
			{
				relation: [
					{
						object: parentGuid,
						position: 4,
						predicate: 'is-part-of-program',
						subject: pageGuid
					},
					{
						object: parentGuid,
						position: 2,
						predicate: 'is-part-of',
						subject: organizationGuid
					}
				]
			}
		)
	);
	const input = createContainerInput.parse({
		organizationGuid,
		parentRelations: [
			{ parentGuid, predicate: 'is-part-of-program' },
			{ parentGuid, predicate: 'is-part-of' }
		],
		payload: { title: 'New goal', type: 'goal' }
	});

	await createMcpContainer({ ...input, tokenId, userId })({} as never);

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith({
		afterCreate: expect.any(Function),
		data: expect.objectContaining({
			relation: [
				{ object: parentGuid, position: 5, predicate: 'is-part-of-program' },
				{ object: parentGuid, position: 3, predicate: 'is-part-of' }
			]
		}),
		features: [],
		user: expect.objectContaining({ guid: userId })
	});
});

test('rejects invalid payloads and templates', async () => {
	const invalidInput = createContainerInput.parse({
		organizationGuid,
		payload: { type: 'task' }
	});
	const templateInput = createContainerInput.parse({
		organizationGuid,
		payload: { template: true, title: 'Template goal', type: 'goal' }
	});

	await expect(
		createMcpContainer({ ...invalidInput, tokenId, userId })({} as never)
	).rejects.toThrow('payload.title');
	await expect(
		createMcpContainer({ ...templateInput, tokenId, userId })({} as never)
	).rejects.toThrow('Template creation is not supported');
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
	expect(mocks.recordMcpWriteEvent).not.toHaveBeenCalled();
});

test.each(['hidden', 'other organization'])('rejects a %s parent', async (condition) => {
	const parentOrganization =
		condition === 'other organization' ? otherOrganizationGuid : organizationGuid;
	mocks.containers.set(
		parentGuid,
		container(
			parentGuid,
			{ title: 'Parent', type: 'program' },
			{ organization: parentOrganization }
		)
	);
	if (condition === 'hidden') mocks.unreadableGuids.add(parentGuid);
	const input = createContainerInput.parse({
		organizationGuid,
		parentRelations: [{ parentGuid, predicate: 'is-part-of-program' }],
		payload: { title: 'New goal', type: 'goal' }
	});

	await expect(createMcpContainer({ ...input, tokenId, userId })({} as never)).rejects.toThrow(
		'Parent container not found or inaccessible.'
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('accepts a visible parent that the user cannot update', async () => {
	mocks.containers.set(parentGuid, container(parentGuid, { title: 'Parent', type: 'program' }));
	mocks.unupdatableGuids.add(parentGuid);
	const input = createContainerInput.parse({
		organizationGuid,
		parentRelations: [{ parentGuid, predicate: 'is-part-of-program' }],
		payload: { title: 'New goal', type: 'goal' }
	});

	await createMcpContainer({ ...input, tokenId, userId })({} as never);

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({
				relation: [{ object: parentGuid, position: 0, predicate: 'is-part-of-program' }]
			})
		})
	);
});

test('rejects duplicate parent relations in the MCP contract', () => {
	expect(() =>
		createContainerInput.parse({
			organizationGuid,
			parentRelations: [
				{ parentGuid, predicate: 'is-part-of' },
				{ parentGuid, predicate: 'is-part-of' }
			],
			payload: { title: 'New goal', type: 'goal' }
		})
	).toThrow('Parent relations must be unique.');
});

test('rejects payload types without a schema resource in the MCP contract', () => {
	expect(
		createContainerInput.safeParse({
			organizationGuid,
			payload: { title: 'New collection', type: 'custom_collection' }
		}).success
	).toBe(false);
});

test('rejects an organizational unit of another organization', async () => {
	mocks.containers.set(
		organizationalUnitGuid,
		container(
			organizationalUnitGuid,
			{ name: 'Foreign office', type: 'organizational_unit' },
			{ organization: otherOrganizationGuid }
		)
	);
	const input = createContainerInput.parse({
		organizationGuid,
		organizationalUnitGuid,
		payload: { title: 'New goal', type: 'goal' }
	});

	await expect(createMcpContainer({ ...input, tokenId, userId })({} as never)).rejects.toThrow(
		'Organization or organizational unit not found or inaccessible.'
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('maps categories to the persisted collection filter and appends the section', async () => {
	mocks.relations = [
		{ object: pageGuid, position: 2, predicate: 'is-section-of' },
		{ object: pageGuid, position: 7, predicate: 'is-part-of' }
	];

	await addMcpCustomCollectionSection({
		categories: { sdg: ['13'] },
		includeSubordinateOrganizationalUnits: true,
		pageGuid,
		title: 'Objekte einbinden',
		types: ['indicator_template'],
		tokenId,
		userId
	})({} as never);

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith({
		afterCreate: expect.any(Function),
		data: expect.objectContaining({
			payload: expect.objectContaining({
				filter: {
					organization: ['current'],
					organizationalUnit: [],
					sdg: ['13'],
					type: ['indicator_template']
				},
				title: 'Objekte einbinden',
				type: 'custom_collection'
			}),
			relation: [{ object: pageGuid, position: 3, predicate: 'is-section-of' }]
		}),
		features: [],
		user: expect.objectContaining({ guid: userId })
	});
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
		{
			containerGuid: createdGuid,
			revision: createdRevision,
			tokenId,
			tool: 'add_custom_collection_section',
			userId
		},
		mocks.transactionConnection
	);
});

test('rejects category values that are not available for the selected types', async () => {
	await expect(
		addMcpCustomCollectionSection({
			categories: { sdg: ['99'] },
			includeSubordinateOrganizationalUnits: false,
			pageGuid,
			title: 'Objekte einbinden',
			types: ['indicator_template'],
			tokenId,
			userId
		})({} as never)
	).rejects.toEqual(expect.any(McpCreationError));
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});
