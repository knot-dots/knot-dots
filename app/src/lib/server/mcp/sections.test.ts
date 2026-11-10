import { locale } from 'svelte-i18n';
import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const mocks = vi.hoisted(() => ({
	containers: new Map<string, Container<AnyPayload>>(),
	createAuthorizedContainer: vi.fn(),
	features: [] as string[],
	featuresOfUser: vi.fn(),
	recordMcpWriteEvent: vi.fn(),
	transactionConnection: { transaction: true }
}));

vi.mock('$lib/authorization', () => ({
	default: () => ({ can: () => true, cannot: () => false })
}));
vi.mock('$lib/server/containerCreation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/containerCreation')>()),
	createAuthorizedContainer: mocks.createAuthorizedContainer
}));
vi.mock('$lib/server/db', () => ({
	getContainerByGuid: (guid: string) => async () => {
		const container = mocks.containers.get(guid);
		if (!container) {
			const { NotFoundError } = await import('slonik');
			throw new NotFoundError('Resource not found.', { sql: '', values: [] });
		}
		return container;
	},
	getManyContainers:
		(_organizations: string[], { guid }: { guid: string[] }) =>
		async () =>
			guid.map((value) => mocks.containers.get(value)).filter(Boolean),
	recordMcpWriteEvent: (event: unknown) => async (connection: unknown) =>
		mocks.recordMcpWriteEvent(event, connection)
}));
vi.mock('$lib/server/features', () => ({
	featuresOfUser: mocks.featuresOfUser,
	getFeatures: () => []
}));
vi.mock('$lib/server/mcp/userContext', () => ({
	loadMcpUserContext: async (_connection: unknown, userId: string) => ({
		familyName: '',
		givenName: '',
		grants: emptyGrantRecords(),
		guid: userId,
		isAuthenticated: true,
		roles: [],
		settings: { features: ['ResourceV2'] }
	})
}));

import { addSectionInput } from '$lib/server/mcp/contracts/sections';
import { addMcpSection } from '$lib/server/mcp/sections';

// Like hooks.server.ts, as containerOfType resolves the default titles.
locale.set('de');

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const unitGuid = '00000000-0000-4000-8000-000000000002';
const measureGuid = '00000000-0000-4000-8000-000000000003';
const goalGuid = '00000000-0000-4000-8000-000000000004';
const measureGoalGuid = '00000000-0000-4000-8000-000000000005';
const simpleMeasureGuid = '00000000-0000-4000-8000-000000000006';
const taskGuid = '00000000-0000-4000-8000-000000000007';
const textGuid = '00000000-0000-4000-8000-000000000008';
const existingSectionGuid = '00000000-0000-4000-8000-000000000009';
const userId = '00000000-0000-4000-8000-00000000000a';
const tokenId = '00000000-0000-4000-8000-00000000000b';
const createdGuid = '00000000-0000-4000-8000-00000000000c';

type Relation = { object: string; position: number; predicate: string; subject: string };

function container(
	guid: string,
	payload: unknown,
	{
		organizationalUnit = null,
		relation = []
	}: { organizationalUnit?: string | null; relation?: Relation[] } = {}
): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: [organizationalUnit ?? organizationGuid],
		organization: organizationGuid,
		organizational_unit: organizationalUnit,
		payload,
		realm: 'test',
		relation,
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-11-10T00:00:00.000Z')
	});
}

function section(guid: string, parentGuid: string, position: number): Relation {
	return { object: parentGuid, position, predicate: 'is-section-of', subject: guid };
}

function store(...containers: Container<AnyPayload>[]) {
	for (const value of containers) {
		mocks.containers.set(value.guid, value);
	}
}

function add(input: Record<string, unknown>) {
	return addMcpSection({ ...addSectionInput.parse(input), tokenId, userId })({} as never);
}

function createdData() {
	return mocks.createAuthorizedContainer.mock.calls[0][0].data;
}

beforeEach(() => {
	mocks.containers.clear();
	store(
		container(organizationGuid, { name: 'Anytown', type: 'organization' }),
		container(
			unitGuid,
			{
				geometry: '00000000-0000-4000-8000-0000000000ff',
				name: 'Old town',
				type: 'organizational_unit'
			},
			{ organizationalUnit: unitGuid }
		),
		container(
			measureGuid,
			{ title: 'Cycle paths', type: 'measure' },
			{ relation: [section(textGuid, measureGuid, 3)] }
		),
		container(
			textGuid,
			{ title: 'Background', type: 'text' },
			{
				relation: [section(textGuid, measureGuid, 3)]
			}
		),
		container(goalGuid, { title: 'Climate neutrality', type: 'goal' }),
		container(
			measureGoalGuid,
			{ title: 'Fewer cars', type: 'goal' },
			{
				relation: [
					{
						object: measureGuid,
						position: 0,
						predicate: 'is-part-of-measure',
						subject: measureGoalGuid
					}
				]
			}
		),
		container(simpleMeasureGuid, { title: 'Bike racks', type: 'simple_measure' }),
		container(taskGuid, { title: 'Plan the route', type: 'task' })
	);
	mocks.features = [];
	mocks.featuresOfUser.mockReset();
	mocks.featuresOfUser.mockImplementation(async () => mocks.features);
	mocks.recordMcpWriteEvent.mockReset();
	mocks.createAuthorizedContainer.mockReset();
	mocks.createAuthorizedContainer.mockImplementation(({ afterCreate, data }) => async () => {
		const created = { ...data, guid: createdGuid, revision: 1, user: [] };
		await afterCreate?.(created, mocks.transactionConnection);
		return created;
	});
});

test.each([
	['administrative_area_basic_data', organizationGuid, {}, 'Basisinformationen'],
	['demographic_data', unitGuid, {}, 'Basisindikatoren'],
	['effect_collection', measureGuid, {}, 'Wirkung'],
	['goal_collection', measureGuid, {}, 'Ziele'],
	['indicator_collection', organizationGuid, {}, 'Indikatoren'],
	['map', unitGuid, {}, 'Gebietsgrenze'],
	['measure_collection', organizationGuid, {}, 'Maßnahmen'],
	['objective_collection', goalGuid, {}, 'Gewünschte Entwicklung'],
	['program_collection', organizationGuid, {}, 'Programme'],
	[
		'progress',
		goalGuid,
		{ measurement: 'subordinateObjects', objectType: 'measure' },
		'Fortschritt'
	],
	['resource_collection', simpleMeasureGuid, {}, 'Ressourcen'],
	[
		'resource_data_collection',
		measureGuid,
		{ resourceDataType: 'resource_data_type.actual_resource_allocation' },
		'Verwendete Ressourcen'
	],
	['summary', goalGuid, {}, 'Zusammenfassung'],
	['task_collection', measureGuid, {}, 'Aufgaben']
])('adds a %s section with its German title', async (type, parentGuid, options, title) => {
	if (type === 'resource_data_collection') {
		mocks.features = ['ResourceV2'];
	}

	const output = await add({ parentGuid, type, ...options });

	expect(createdData()).toMatchObject({
		payload: { ...options, title, type },
		relation: [
			{
				object: parentGuid,
				position: parentGuid === measureGuid ? 4 : 0,
				predicate: 'is-section-of'
			}
		]
	});
	expect(output).toMatchObject({ guid: createdGuid, label: title, revision: 1, type });
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
		{ containerGuid: createdGuid, revision: 1, tokenId, tool: 'add_section', userId },
		mocks.transactionConnection
	);
});

test('decides about resource sections with the features of the token owner', async () => {
	await add({ parentGuid: simpleMeasureGuid, type: 'resource_collection' });

	expect(mocks.featuresOfUser).toHaveBeenCalledExactlyOnceWith({ features: ['ResourceV2'] });
});

test('adds the section of an organizational unit to the unit', async () => {
	await add({ parentGuid: unitGuid, type: 'map' });

	expect(createdData()).toMatchObject({ organizational_unit: unitGuid });
});

test('titles a task collection below a task as subtasks', async () => {
	await add({ parentGuid: taskGuid, type: 'task_collection' });

	expect(createdData().payload.title).toBe('Unteraufgaben');
});

test('keeps a chosen color and visibility', async () => {
	await add({
		color: 'color.blue',
		parentGuid: measureGuid,
		type: 'goal_collection',
		visibility: 'members'
	});

	expect(createdData().payload).toMatchObject({ color: 'color.blue', visibility: 'members' });
});

test('titles a budget like the heading of its section', async () => {
	mocks.features = ['ResourceV2'];

	await add({
		parentGuid: goalGuid,
		resourceDataType: 'resource_data_type.budget',
		type: 'resource_data_collection'
	});

	expect(createdData().payload.title).toBe('Budget');
});

test.each([
	[
		'goal_collection',
		goalGuid,
		'A goal_collection section can only be added to a container of type measure, simple_measure.'
	],
	[
		'progress',
		simpleMeasureGuid,
		'A progress section can only be added to a container of type goal, measure.'
	],
	[
		'map',
		measureGuid,
		'A map section can only be added to a container of type organization, organizational_unit.'
	]
])('rejects a %s section in a parent of another type', async (type, parentGuid, message) => {
	await expect(add({ parentGuid, type })).rejects.toThrow(message);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('rejects a parent the user cannot find', async () => {
	await expect(
		add({ parentGuid: '00000000-0000-4000-8000-0000000000ee', type: 'goal_collection' })
	).rejects.toThrow('Parent container not found or inaccessible.');
});

test.each([
	[['measures'], 'An indicator_collection needs the indicators workspace to be visible.'],
	[['indicators', 'measures'], undefined]
])('checks the visible workspaces %j for an indicator collection', async (workspaces, message) => {
	store(
		container(organizationGuid, {
			name: 'Anytown',
			type: 'organization',
			visibleWorkspaces: workspaces
		})
	);

	const result = add({ parentGuid: organizationGuid, type: 'indicator_collection' });

	if (message) {
		await expect(result).rejects.toThrow(message);
	} else {
		await expect(result).resolves.toMatchObject({ type: 'indicator_collection' });
	}
});

test('rejects demographic data for an organizational unit without a geometry', async () => {
	store(
		container(
			unitGuid,
			{ name: 'Old town', type: 'organizational_unit' },
			{ organizationalUnit: unitGuid }
		)
	);

	await expect(add({ parentGuid: unitGuid, type: 'demographic_data' })).rejects.toThrow(
		'A demographic_data section needs an organizational unit with a geometry.'
	);
});

test('adds effects to a goal only if it is part of a measure', async () => {
	await expect(add({ parentGuid: goalGuid, type: 'effect_collection' })).rejects.toThrow(
		'An effect_collection can only be added to a goal that is part of a measure.'
	);
	await expect(
		add({ parentGuid: measureGoalGuid, type: 'effect_collection' })
	).resolves.toMatchObject({ type: 'effect_collection' });
});

test('rejects objectives for a goal that is part of a measure', async () => {
	await expect(add({ parentGuid: measureGoalGuid, type: 'objective_collection' })).rejects.toThrow(
		'An objective_collection cannot be added to a goal that is part of a measure.'
	);
});

test.each([
	[
		[],
		{
			resourceDataType: 'resource_data_type.actual_resource_allocation',
			type: 'resource_data_collection'
		},
		measureGuid,
		'A resource_data_collection needs resource planning (the ResourceV2 feature).'
	],
	[
		['ResourceV2'],
		{ type: 'resource_collection' },
		measureGuid,
		'With resource planning, add a resource_data_collection instead.'
	],
	[
		['ResourceV2'],
		{ resourceDataType: 'resource_data_type.budget', type: 'resource_data_collection' },
		measureGuid,
		'Only a goal can show its budget.'
	],
	[
		['ResourceV2'],
		{
			resourceDataType: 'resource_data_type.planned_resource_allocation',
			type: 'resource_data_collection'
		},
		goalGuid,
		'Only a measure can show its resource allocation.'
	]
])(
	'applies the resource rules with features %j to %j',
	async (features, input, parentGuid, message) => {
		mocks.features = features;

		await expect(add({ parentGuid, ...input })).rejects.toThrow(message);
	}
);

test('adds a budget to a goal with resource planning', async () => {
	mocks.features = ['ResourceV2'];

	await expect(
		add({
			parentGuid: goalGuid,
			resourceDataType: 'resource_data_type.budget',
			type: 'resource_data_collection'
		})
	).resolves.toMatchObject({ type: 'resource_data_collection' });
});

test('rejects a second section of the same type', async () => {
	store(
		container(
			measureGuid,
			{ title: 'Cycle paths', type: 'measure' },
			{
				relation: [section(textGuid, measureGuid, 3), section(existingSectionGuid, measureGuid, 4)]
			}
		),
		container(existingSectionGuid, { title: 'Ziele', type: 'goal_collection' })
	);

	await expect(add({ parentGuid: measureGuid, type: 'goal_collection' })).rejects.toThrow(
		'The measure has a goal_collection section already.'
	);
	await expect(add({ parentGuid: measureGuid, type: 'task_collection' })).resolves.toMatchObject({
		type: 'task_collection'
	});
});

test('adds one resource data collection per type of resource data', async () => {
	mocks.features = ['ResourceV2'];
	store(
		container(
			measureGuid,
			{ title: 'Cycle paths', type: 'measure' },
			{ relation: [section(existingSectionGuid, measureGuid, 0)] }
		),
		container(existingSectionGuid, {
			resourceDataType: 'resource_data_type.actual_resource_allocation',
			title: 'Ressourcendaten',
			type: 'resource_data_collection'
		})
	);

	await expect(
		add({
			parentGuid: measureGuid,
			resourceDataType: 'resource_data_type.actual_resource_allocation',
			type: 'resource_data_collection'
		})
	).rejects.toThrow(
		'The measure has a resource_data_collection section for resource_data_type.actual_resource_allocation already.'
	);
	await expect(
		add({
			parentGuid: measureGuid,
			resourceDataType: 'resource_data_type.planned_resource_allocation',
			type: 'resource_data_collection'
		})
	).resolves.toMatchObject({ type: 'resource_data_collection' });
});

test.each([
	[
		{ measurement: 'manual', type: 'goal_collection' },
		'measurement and objectType apply only to a progress section.'
	],
	[
		{ resourceDataType: 'resource_data_type.budget', type: 'goal_collection' },
		'resourceDataType is required for a resource_data_collection, and only for it.'
	],
	[
		{ type: 'resource_data_collection' },
		'resourceDataType is required for a resource_data_collection, and only for it.'
	],
	[
		{ color: 'color.blue', type: 'effect_collection' },
		'An effect_collection has no background color.'
	],
	[
		{ resourceDataType: 'resource_data_type.total_budget', type: 'resource_data_collection' },
		'Invalid option'
	],
	[{ type: 'goal_collection', visibility: 'public' }, 'Invalid option'],
	[{ type: 'text' }, 'Add text sections with create_container.'],
	[
		{ type: 'custom_collection' },
		'Add custom_collection sections with add_custom_collection_section.'
	],
	[{ type: 'html' }, 'Invalid option']
])('rejects the input %j in the contract', (input, message) => {
	const result = addSectionInput.safeParse({ parentGuid: measureGuid, ...input });

	expect(result.success).toBe(false);
	expect(result.error?.issues.map(({ message }) => message).join(' ')).toContain(message);
});
