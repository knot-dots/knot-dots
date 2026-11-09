import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

// Categories are identified by the GUID of their category container and
// their values by the GUID of their term container.
const sdg = vi.hoisted(() => ({
	climateAction: '00000000-0000-4000-8000-0000000000c2',
	key: '00000000-0000-4000-8000-0000000000c1'
}));

const mocks = vi.hoisted(() => ({
	categoryContext: {
		keys: [sdg.key],
		labels: new Map([[sdg.key, 'Sustainable Development Goal']]),
		objectTypesPerKey: { [sdg.key]: ['indicator'] },
		options: { [sdg.key]: [{ label: 'Climate action', value: sdg.climateAction }] }
	},
	containers: new Map<string, Container<AnyPayload>>(),
	createAuthorizedContainer: vi.fn(),
	recordMcpWriteEvent: vi.fn(),
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
	getContainerByGuid: (guid: string) => async () => mocks.containers.get(guid),
	getManyContainers:
		(_organizations: string[], { guid }: { guid: string[] }) =>
		async () =>
			guid.map((value) => mocks.containers.get(value)).filter(Boolean),
	recordMcpWriteEvent: (event: unknown) => async (connection: unknown) =>
		mocks.recordMcpWriteEvent(event, connection)
}));
vi.mock('$lib/server/features', () => ({ getFeatures: () => [] }));
vi.mock('$lib/server/mcp/categories', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/mcp/categories')>()),
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

import { createContainerInput, createContainersInput } from '$lib/server/mcp/contracts/creation';
import { mcpPayloadTypeValues } from '$lib/server/mcp/contracts/payloads';
import { createMcpContainer, createMcpContainers } from '$lib/server/mcp/creation';

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
	['indicator', { title: 'Created indicator', type: 'indicator', unit: 't CO2e' }],
	['resource_v2', { title: 'Created resource', type: 'resource_v2' }],
	['binary_indicator', { title: 'Created binary indicator', type: 'binary_indicator' }],
	['effect', { title: 'Created effect', type: 'effect' }],
	['objective', { title: 'Created objective', type: 'objective' }],
	['rule', { title: 'Created rule', type: 'rule' }],
	['text', { body: 'Created text', title: 'Created text', type: 'text' }],
	['category', { title: 'Created category', type: 'category' }]
] as const;

// A term needs a parent, so it has tests of its own.
test('covers every resource-backed payload type with a creation fixture', () => {
	expect([...payloadCases.map(([type]) => type), 'term']).toEqual(mcpPayloadTypeValues);
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
	const parentGoalGuid = '00000000-0000-4000-8000-00000000000d';
	mocks.containers.set(
		parentGuid,
		container(
			parentGuid,
			{ title: 'Climate program', type: 'program' },
			{
				relation: [
					{ object: parentGuid, position: 4, predicate: 'is-part-of-program', subject: pageGuid },
					{ object: parentGuid, position: 6, predicate: 'is-section-of', subject: pageGuid }
				]
			}
		)
	);
	mocks.containers.set(
		parentGoalGuid,
		container(
			parentGoalGuid,
			{ title: 'Climate neutrality', type: 'goal' },
			{
				relation: [
					{ object: parentGoalGuid, position: 2, predicate: 'is-part-of', subject: pageGuid }
				]
			}
		)
	);
	const input = createContainerInput.parse({
		organizationGuid,
		parentRelations: [
			{ parentGuid, predicate: 'is-part-of-program' },
			{ parentGuid: parentGoalGuid, predicate: 'is-part-of' }
		],
		payload: { title: 'New goal', type: 'goal' }
	});

	await createMcpContainer({ ...input, tokenId, userId })({} as never);

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith({
		afterCreate: expect.any(Function),
		data: expect.objectContaining({
			relation: [
				{ object: parentGuid, position: 5, predicate: 'is-part-of-program' },
				{ object: parentGuid, position: 7, predicate: 'is-section-of' },
				{ object: parentGoalGuid, position: 3, predicate: 'is-part-of' }
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
	).rejects.toThrow(
		'Containers marked as templates (template: true) cannot be created by this tool.'
	);
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
				relation: [
					{ object: parentGuid, position: 0, predicate: 'is-part-of-program' },
					{ object: parentGuid, position: 0, predicate: 'is-section-of' }
				]
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

function setUnitScopedProgram(guid = parentGuid, unit = organizationalUnitGuid) {
	mocks.containers.set(
		unit,
		container(unit, { name: 'Climate office', type: 'organizational_unit' })
	);
	mocks.containers.set(
		guid,
		container(guid, { title: 'Unit program', type: 'program' }, { organizationalUnit: unit })
	);
}

function createGoalInProgram(organizationalUnit: string | null, parents = [parentGuid]) {
	return createMcpContainer({
		...createContainerInput.parse({
			organizationGuid,
			organizationalUnitGuid: organizationalUnit,
			parentRelations: parents.map((guid) => ({
				parentGuid: guid,
				predicate: 'is-part-of-program'
			})),
			payload: { title: 'Unit goal', type: 'goal' }
		}),
		tokenId,
		userId
	})({} as never);
}

test.each([
	['omitted', null],
	['given', organizationalUnitGuid]
])('creates the container in the unit of its parents when the unit is %s', async (_, unit) => {
	setUnitScopedProgram();

	await createGoalInProgram(unit);

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({
				managed_by: [organizationalUnitGuid],
				organizational_unit: organizationalUnitGuid
			})
		})
	);
});

test('rejects a unit that differs from the unit of the parents', async () => {
	const otherUnitGuid = '00000000-0000-4000-8000-00000000000a';
	setUnitScopedProgram();
	mocks.containers.set(
		otherUnitGuid,
		container(otherUnitGuid, { name: 'Mobility office', type: 'organizational_unit' })
	);

	await expect(createGoalInProgram(otherUnitGuid)).rejects.toThrow(
		'The organizational unit must be the one of the parents; omit it to use theirs.'
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('rejects parents of different units', async () => {
	const otherProgramGuid = '00000000-0000-4000-8000-00000000000b';
	setUnitScopedProgram();
	setUnitScopedProgram(otherProgramGuid, '00000000-0000-4000-8000-00000000000c');

	await expect(createGoalInProgram(null, [parentGuid, otherProgramGuid])).rejects.toThrow(
		'All parents must belong to the same organizational unit.'
	);
});

test.each([
	['goal', 'is-part-of-program', 'task'],
	['goal', 'is-part-of-measure', 'program'],
	['goal', 'is-part-of', 'program'],
	['task', 'is-part-of', 'task'],
	['page', 'is-part-of', 'goal'],
	['effect', 'is-part-of', 'goal'],
	['objective', 'is-part-of', 'measure'],
	['binary_indicator', 'is-part-of', 'goal'],
	['binary_indicator', 'is-part-of-program', 'program'],
	['task', 'is-part-of-program', 'program'],
	['effect', 'is-part-of-program', 'program'],
	['page', 'is-part-of-program', 'program'],
	['indicator', 'is-part-of-measure', 'measure'],
	['text', 'is-part-of-program', 'program'],
	['goal', 'is-section-of', 'page'],
	['goal', 'is-section-of', 'program'],
	['text', 'is-section-of', 'effect'],
	['text', 'is-section-of', 'objective'],
	['text', 'is-section-of', 'binary_indicator'],
	['text', 'is-part-of', 'goal']
] as const)('rejects a %s %s a %s', async (type, predicate, parentType) => {
	mocks.containers.set(
		parentGuid,
		container(parentGuid, {
			...(parentType === 'page' ? { body: '' } : {}),
			title: 'Parent',
			type: parentType
		})
	);
	const input = createContainerInput.parse({
		organizationGuid,
		parentRelations: [{ parentGuid, predicate }],
		payload:
			type === 'page'
				? { body: '', title: 'Page', type }
				: type === 'indicator'
					? { title: 'Child', type, unit: 'unit.percent' }
					: { title: 'Child', type }
	});

	await expect(createMcpContainer({ ...input, tokenId, userId })({} as never)).rejects.toThrow(
		new RegExp(`^An? ${parentType} cannot be the ${predicate} parent of an? ${type}\\.$`)
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test.each([
	['text', 'is-section-of', 'effect', 'An effect cannot be the is-section-of parent of a text.'],
	['effect', 'is-part-of', 'goal', 'A goal cannot be the is-part-of parent of an effect.']
] as const)('names a %s %s %s with its article', async (type, predicate, parentType, message) => {
	mocks.containers.set(parentGuid, container(parentGuid, { title: 'Parent', type: parentType }));

	await expect(createWith({ title: 'Child', type }, [{ parentGuid, predicate }])).rejects.toThrow(
		message
	);
});

test.each([
	['measure', 'is-part-of-measure', 'simple_measure'],
	['task', 'is-part-of', 'measure'],
	['knowledge', 'is-part-of', 'knowledge'],
	['measure', 'is-part-of-program', 'program'],
	['rule', 'is-part-of-program', 'program'],
	['effect', 'is-part-of', 'simple_measure'],
	['objective', 'is-part-of', 'goal'],
	['text', 'is-section-of', 'measure'],
	['text', 'is-section-of', 'page'],
	['text', 'is-section-of', 'program']
] as const)('accepts a %s %s a %s', async (type, predicate, parentType) => {
	mocks.containers.set(
		parentGuid,
		container(parentGuid, {
			...(parentType === 'page' ? { body: '' } : {}),
			title: 'Parent',
			type: parentType
		})
	);
	const input = createContainerInput.parse({
		organizationGuid,
		parentRelations: [{ parentGuid, predicate }],
		payload: { title: 'Child', type }
	});

	await createMcpContainer({ ...input, tokenId, userId })({} as never);

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledOnce();
});

function createWith(payload: Record<string, unknown>, parentRelations: unknown[] = []) {
	return createMcpContainer({
		...createContainerInput.parse({ organizationGuid, parentRelations, payload }),
		tokenId,
		userId
	})({} as never);
}

function createdPayload() {
	return mocks.createAuthorizedContainer.mock.calls[0][0].data.payload;
}

test('accepts category values the organization offers', async () => {
	await createWith({
		category: { [sdg.key]: [sdg.climateAction] },
		title: 'Climate indicator',
		type: 'goal'
	});

	expect(createdPayload()).toMatchObject({ category: { [sdg.key]: [sdg.climateAction] } });
});

test.each([
	// The slug that identified the category before its GUID did.
	[{ sdg: [sdg.climateAction] }, 'Unknown category: sdg.'],
	[{ [sdg.key]: ['Climate action'] }, `Unknown value of category ${sdg.key}: Climate action.`]
])('rejects unknown categories and category values', async (category, message) => {
	await expect(createWith({ category, title: 'Climate goal', type: 'goal' })).rejects.toThrow(
		message
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('derives the hierarchy level of a measure below a measure', async () => {
	mocks.containers.set(
		parentGuid,
		container(parentGuid, { hierarchyLevel: 2, title: 'Mobility', type: 'measure' })
	);

	await createWith({ hierarchyLevel: 1, title: 'Bike lanes', type: 'measure' }, [
		{ parentGuid, predicate: 'is-part-of-measure' }
	]);

	expect(createdPayload()).toMatchObject({ hierarchyLevel: 3 });
});

test('keeps the hierarchy level of a measure that is not below a measure', async () => {
	mocks.containers.set(parentGuid, container(parentGuid, { title: 'Plan', type: 'program' }));

	await createWith({ hierarchyLevel: 2, title: 'Bike lanes', type: 'measure' }, [
		{ parentGuid, predicate: 'is-part-of-program' }
	]);

	expect(createdPayload()).toMatchObject({ hierarchyLevel: 2 });
});

test('rejects nesting measures deeper than the deepest hierarchy level', async () => {
	mocks.containers.set(
		parentGuid,
		container(parentGuid, { hierarchyLevel: 6, title: 'Detail', type: 'measure' })
	);

	await expect(
		createWith({ title: 'Too deep', type: 'measure' }, [
			{ parentGuid, predicate: 'is-part-of-measure' }
		])
	).rejects.toThrow('Measures can be nested at most 6 levels deep.');
});

test('marks created content as AI-generated whatever the payload says', async () => {
	await createWith({ aiContribution: 0, title: 'Climate goal', type: 'goal' });

	expect(createdPayload()).toMatchObject({ aiContribution: 1 });
});

test('appends a text section after the existing sections', async () => {
	const sectionGuid = '00000000-0000-4000-8000-00000000000e';
	mocks.containers.set(
		parentGuid,
		container(
			parentGuid,
			{ title: 'Bike lanes', type: 'measure' },
			{
				relation: [
					{ object: parentGuid, position: 1, predicate: 'is-section-of', subject: sectionGuid },
					{ object: parentGuid, position: 4, predicate: 'is-part-of', subject: pageGuid }
				]
			}
		)
	);

	await createWith({ body: 'Background', title: 'Background', type: 'text' }, [
		{ parentGuid, predicate: 'is-section-of' }
	]);

	expect(mocks.createAuthorizedContainer.mock.calls[0][0].data.relation).toEqual([
		{ object: parentGuid, position: 2, predicate: 'is-section-of' }
	]);
});

test.each(['goal', 'knowledge', 'measure', 'rule', 'simple_measure'] as const)(
	'makes a %s that is part of a program a section of the program',
	async (type) => {
		mocks.containers.set(
			parentGuid,
			container(
				parentGuid,
				{ title: 'Climate program', type: 'program' },
				{
					relation: [
						{ object: parentGuid, position: 0, predicate: 'is-section-of', subject: pageGuid },
						{ object: parentGuid, position: 3, predicate: 'is-part-of-program', subject: pageGuid }
					]
				}
			)
		);

		await createWith({ title: 'Part', type }, [{ parentGuid, predicate: 'is-part-of-program' }]);

		expect(mocks.createAuthorizedContainer.mock.calls[0][0].data.relation).toEqual([
			{ object: parentGuid, position: 4, predicate: 'is-part-of-program' },
			{ object: parentGuid, position: 1, predicate: 'is-section-of' }
		]);
	}
);

test.each([
	['an organization', organizationGuid, null],
	['an organizational unit', organizationalUnitGuid, organizationalUnitGuid]
])('creates a text section of %s in its area', async (_, areaGuid, unit) => {
	mocks.containers.set(
		organizationalUnitGuid,
		container(organizationalUnitGuid, { name: 'Climate office', type: 'organizational_unit' })
	);

	await createWith({ body: 'Welcome', title: 'Welcome', type: 'text' }, [
		{ parentGuid: areaGuid, predicate: 'is-section-of' }
	]);

	expect(mocks.createAuthorizedContainer.mock.calls[0][0].data).toMatchObject({
		managed_by: [areaGuid],
		organization: organizationGuid,
		organizational_unit: unit,
		relation: [{ object: areaGuid, position: 0, predicate: 'is-section-of' }]
	});
});

const firstGuid = '00000000-0000-4000-8000-000000000010';
const secondGuid = '00000000-0000-4000-8000-000000000011';

function createMany(containers: Array<Record<string, unknown>>) {
	return createMcpContainers({
		...createContainersInput.parse({ containers, organizationGuid }),
		tokenId,
		userId
	})({} as never);
}

function goalOf(guid: string, parentRelations: Array<Record<string, string>>) {
	return { guid, parentRelations, payload: { title: 'Less traffic', type: 'goal' } };
}

const inProgram = { parentGuid, predicate: 'is-part-of-program' };

test.each([
	[
		'whose parents are all created in the same call',
		[
			goalOf(firstGuid, [inProgram]),
			goalOf(secondGuid, [{ parentGuid: firstGuid, predicate: 'is-part-of' }])
		],
		'containers[1]: At least one parent must exist already, since the container gets its permissions from it; create the parents in an earlier call.'
	],
	[
		'listed before its parent',
		[
			goalOf(secondGuid, [inProgram, { parentGuid: firstGuid, predicate: 'is-part-of' }]),
			goalOf(firstGuid, [inProgram])
		],
		'containers[0]: A parent created in the same call must be listed before its children.'
	],
	[
		'related to itself',
		[
			{
				...goalOf(firstGuid, [inProgram]),
				relations: [{ objectGuid: firstGuid, predicate: 'contributes-to' }]
			}
		],
		'containers[0]: A container cannot be related to itself.'
	],
	[
		'that is a category with relations',
		[
			{
				guid: firstGuid,
				payload: { title: 'Mobility', type: 'category' },
				relations: [{ objectGuid: parentGuid, predicate: 'contributes-to' }]
			}
		],
		'containers[0]: A category classifies other containers and cannot be related to them; leave its relations empty.'
	],
	[
		'measured by an existing indicator',
		[
			{
				guid: firstGuid,
				payload: { title: 'Cycling share', type: 'effect' },
				relations: [{ objectGuid: pageGuid, predicate: 'is-measured-by' }]
			}
		],
		'containers[0]: is-measured-by links a new effect to an indicator or binary indicator created in the same call; to link an existing indicator, use attach_indicator.'
	]
])('rejects a container %s before writing', async (_, containers, message) => {
	mocks.containers.set(parentGuid, container(parentGuid, { title: 'Climate', type: 'program' }));
	mocks.containers.set(
		pageGuid,
		container(pageGuid, { title: 'Cycling share', type: 'indicator', unit: '%' })
	);

	await expect(createMany(containers)).rejects.toThrow(message);
});

test.each([
	['the same GUID twice', [goalOf(firstGuid, []), goalOf(firstGuid, [])]],
	[
		'a structural relation among the relations',
		[{ ...goalOf(firstGuid, []), relations: [{ objectGuid: parentGuid, predicate: 'is-part-of' }] }]
	],
	['no containers', []]
])('rejects %s in the contract', (_, containers) => {
	expect(createContainersInput.safeParse({ containers, organizationGuid }).success).toBe(false);
});

const categoryGuid = '00000000-0000-4000-8000-000000000012';
const termGuid = '00000000-0000-4000-8000-000000000013';
const subtermGuid = '00000000-0000-4000-8000-000000000014';

function setCategoryWithTerms() {
	mocks.containers.set(
		categoryGuid,
		container(
			categoryGuid,
			{ title: 'Mobility', type: 'category' },
			{
				relation: [
					{ object: categoryGuid, position: 0, predicate: 'is-part-of-category', subject: termGuid }
				]
			}
		)
	);
	mocks.containers.set(
		termGuid,
		container(
			termGuid,
			{ title: 'Cycling', type: 'term' },
			{
				relation: [
					{
						object: categoryGuid,
						position: 0,
						predicate: 'is-part-of-category',
						subject: termGuid
					},
					{ object: termGuid, position: 0, predicate: 'is-part-of', subject: subtermGuid }
				]
			}
		)
	);
	mocks.containers.set(
		subtermGuid,
		container(
			subtermGuid,
			{ title: 'Bike lanes', type: 'term' },
			{
				relation: [{ object: termGuid, position: 0, predicate: 'is-part-of', subject: subtermGuid }]
			}
		)
	);
}

test.each([
	['a term to its category', categoryGuid, 'is-part-of-category', 1],
	['a term below a term', termGuid, 'is-part-of', 1]
])('appends %s', async (_, parent, predicate, position) => {
	setCategoryWithTerms();

	await createWith({ title: 'Walking', type: 'term' }, [{ parentGuid: parent, predicate }]);

	expect(mocks.createAuthorizedContainer.mock.calls[0][0].data.relation).toEqual([
		{ object: parent, position, predicate }
	]);
});

test.each([
	[
		'a term without a parent',
		{ title: 'Walking', type: 'term' },
		[],
		'A term needs exactly one parent: its category (is-part-of-category) or the term it is below (is-part-of).'
	],
	[
		'a term in a category and below a term',
		{ title: 'Walking', type: 'term' },
		[
			{ parentGuid: categoryGuid, predicate: 'is-part-of-category' },
			{ parentGuid: termGuid, predicate: 'is-part-of' }
		],
		'A term needs exactly one parent: its category (is-part-of-category) or the term it is below (is-part-of).'
	],
	[
		'a term below a term that is below a term',
		{ title: 'Painted lanes', type: 'term' },
		[{ parentGuid: subtermGuid, predicate: 'is-part-of' }],
		'A term can only be below a term that is part of a category.'
	],
	[
		'a term in a page',
		{ title: 'Walking', type: 'term' },
		[{ parentGuid: pageGuid, predicate: 'is-part-of-category' }],
		'A page cannot be the is-part-of-category parent of a term.'
	],
	[
		'a goal in a category',
		{ title: 'Less traffic', type: 'goal' },
		[{ parentGuid: categoryGuid, predicate: 'is-part-of-category' }],
		'A category cannot be the is-part-of-category parent of a goal.'
	],
	[
		'a category with a parent',
		{ title: 'Mobility', type: 'category' },
		[{ parentGuid: pageGuid, predicate: 'is-section-of' }],
		'A page cannot be the is-section-of parent of a category.'
	]
])('rejects %s', async (_, payload, parentRelations, message) => {
	setCategoryWithTerms();

	await expect(createWith(payload, parentRelations)).rejects.toThrow(message);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('derives the legacy slug of a category from its title instead of taking it', async () => {
	await createWith({ key: 'sdg', title: 'Mobility', type: 'category' });

	expect(createdPayload()).toMatchObject({ key: 'Mobility', title: 'Mobility' });
});
