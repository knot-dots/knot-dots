import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const mocks = vi.hoisted(() => ({
	containers: new Map<string, Container<AnyPayload>>(),
	createAuthorizedContainer: vi.fn(),
	recordMcpWriteEvent: vi.fn(),
	transactionConnection: { transaction: true },
	unreadableGuids: new Set<string>(),
	updateContainer: vi.fn()
}));

vi.mock('$lib/authorization', () => ({
	default: () => {
		const isDenied = (action: string, subject: Container<AnyPayload>) =>
			action === 'read' && mocks.unreadableGuids.has(subject.guid);
		return {
			can: (action: string, subject: Container<AnyPayload>) => !isDenied(action, subject),
			cannot: isDenied
		};
	}
}));
vi.mock('$lib/server/computeManagedBy', () => ({
	applyComputedManagedBy: async (_connection: unknown, containers: unknown[]) => containers
}));
vi.mock('$lib/server/containerCreation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/containerCreation')>()),
	createAuthorizedContainer: mocks.createAuthorizedContainer
}));
vi.mock('$lib/server/db', () => ({
	ContainerRevisionConflictError: class ContainerRevisionConflictError extends Error {},
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
		mocks.recordMcpWriteEvent(event, connection),
	updateContainer: (container: unknown, options: unknown) => async () =>
		mocks.updateContainer(container, options)
}));
vi.mock('$lib/server/features', () => ({ getFeatures: () => [] }));
vi.mock('$lib/server/mcp/categories', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/mcp/categories')>()),
	loadMcpCategoryContext: async () => ({
		keys: ['sdg'],
		labels: new Map([['sdg', 'Sustainable Development Goal']]),
		objectTypesPerKey: { sdg: ['goal'] },
		options: {
			sdg: [
				{ label: 'Climate action', subOptions: [{ label: 'Target', value: '13.2' }], value: '13' }
			]
		}
	})
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

import {
	addCustomCollectionSectionInput,
	updateCustomCollectionSectionInput
} from '$lib/server/mcp/contracts/customCollections';
import {
	addMcpCustomCollectionSection,
	updateMcpCustomCollectionSection
} from '$lib/server/mcp/customCollections';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const programGuid = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';
const createdGuid = '00000000-0000-4000-8000-000000000004';
const tokenId = '00000000-0000-4000-8000-000000000005';
const goalGuid = '00000000-0000-4000-8000-000000000006';
const sectionGuid = '00000000-0000-4000-8000-000000000007';
const unitGuid = '00000000-0000-4000-8000-000000000008';

function container(
	guid: string,
	payload: unknown,
	options: {
		relation?: Array<{ object: string; position: number; predicate: string; subject: string }>;
		revision?: number;
	} = {}
): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload,
		realm: 'test',
		relation: options.relation ?? [],
		revision: options.revision ?? 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-11-09T00:00:00.000Z')
	});
}

function collection(payload: Record<string, unknown>) {
	return container(
		sectionGuid,
		{ title: 'Climate goals', type: 'custom_collection', ...payload },
		{
			relation: [
				{ object: programGuid, position: 0, predicate: 'is-section-of', subject: sectionGuid }
			],
			revision: 2
		}
	);
}

function add(input: Record<string, unknown>) {
	return addMcpCustomCollectionSection({
		...addCustomCollectionSectionInput.parse({
			parentGuid: programGuid,
			title: 'Climate goals',
			...input
		}),
		tokenId,
		userId
	})({} as never);
}

function update(input: Record<string, unknown>, expectedRevision = 2) {
	return updateMcpCustomCollectionSection({
		...updateCustomCollectionSectionInput.parse({ expectedRevision, guid: sectionGuid, ...input }),
		tokenId,
		userId
	})({} as never);
}

function createdData() {
	return mocks.createAuthorizedContainer.mock.calls[0][0].data;
}

function updatedPayload() {
	return mocks.updateContainer.mock.calls[0][0].payload;
}

beforeEach(() => {
	mocks.containers.clear();
	mocks.containers.set(
		organizationGuid,
		container(organizationGuid, { name: 'Anytown', type: 'organization' })
	);
	mocks.containers.set(
		programGuid,
		container(
			programGuid,
			{ title: 'Climate program', type: 'program' },
			{
				relation: [
					{ object: programGuid, position: 2, predicate: 'is-section-of', subject: goalGuid },
					{ object: programGuid, position: 5, predicate: 'is-part-of-program', subject: goalGuid }
				]
			}
		)
	);
	mocks.containers.set(goalGuid, container(goalGuid, { title: 'Climate goal', type: 'goal' }));
	mocks.unreadableGuids.clear();
	mocks.recordMcpWriteEvent.mockReset();
	mocks.createAuthorizedContainer.mockReset();
	mocks.createAuthorizedContainer.mockImplementation(({ afterCreate, data }) => async () => {
		const created = { ...data, guid: createdGuid, revision: 1 };
		await afterCreate?.(created, mocks.transactionConnection);
		return created;
	});
	mocks.updateContainer.mockReset();
	mocks.updateContainer.mockImplementation(async (next, { afterUpdate }) => {
		const updated = { ...next, revision: 3 };
		await afterUpdate?.(updated, mocks.transactionConnection);
		return updated;
	});
});

test('appends a collection that follows a filter to the sections of a program', async () => {
	const output = await add({ categories: { sdg: ['13'] }, types: ['goal'] });

	expect(createdData()).toMatchObject({
		payload: {
			filter: {
				organization: ['current'],
				organizationalUnit: [],
				sdg: ['13'],
				type: ['goal']
			},
			item: [],
			listType: 'wall',
			title: 'Climate goals',
			type: 'custom_collection'
		},
		relation: [{ object: programGuid, position: 3, predicate: 'is-section-of' }]
	});
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
		{
			containerGuid: createdGuid,
			revision: 1,
			tokenId,
			tool: 'add_custom_collection_section',
			userId
		},
		mocks.transactionConnection
	);
	expect(output).toEqual({
		section: {
			additionalFilters: {},
			allowSearch: false,
			allowSort: false,
			categories: { sdg: ['13'] },
			description: null,
			guid: createdGuid,
			items: [],
			listType: 'wall',
			mode: 'filter',
			organizationScope: { includeSubordinateOrganizationalUnits: true, type: 'current' },
			parentGuid: programGuid,
			revision: 1,
			showDescription: false,
			sort: 'alpha',
			title: 'Climate goals',
			types: ['goal']
		}
	});
});

test('appends a fixed selection of items with the given display settings', async () => {
	await add({ items: [goalGuid], listType: 'carousel', sort: 'modified' });

	expect(createdData().payload).toMatchObject({
		filter: {},
		item: [goalGuid],
		listType: 'carousel',
		sort: 'modified'
	});
});

test('rejects items the user cannot read', async () => {
	mocks.unreadableGuids.add(goalGuid);

	await expect(add({ items: [goalGuid] })).rejects.toThrow(
		`Item not found or inaccessible: ${goalGuid}.`
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('rejects category values the organization does not offer', async () => {
	await expect(add({ categories: { sdg: ['99'] }, types: ['goal'] })).rejects.toThrow(
		'Unknown value of category sdg: 99.'
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('rejects a parent whose detail view shows no sections, like a text section', async () => {
	mocks.containers.set(goalGuid, container(goalGuid, { title: 'Less traffic', type: 'effect' }));

	await expect(add({ parentGuid: goalGuid, types: ['goal'] })).rejects.toThrow(
		'A effect cannot be the is-section-of parent of a custom_collection.'
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('appends a collection to an organizational unit within the unit', async () => {
	mocks.containers.set(
		unitGuid,
		container(unitGuid, { name: 'Climate office', type: 'organizational_unit' })
	);

	const { section } = await add({ parentGuid: unitGuid, types: ['goal'] });

	expect(createdData()).toMatchObject({
		managed_by: [unitGuid],
		organizational_unit: unitGuid,
		relation: [{ object: unitGuid, position: 0, predicate: 'is-section-of' }]
	});
	expect(section.parentGuid).toBe(unitGuid);
});

test.each([
	['neither types nor items', {}],
	['both types and items', { items: [goalGuid], types: ['goal'] }],
	['categories with items', { categories: { sdg: ['13'] }, items: [goalGuid] }],
	['an empty selection', { items: [] }]
])('rejects %s in the contract', (_, input) => {
	expect(
		addCustomCollectionSectionInput.safeParse({
			parentGuid: programGuid,
			title: 'Climate goals',
			...input
		}).success
	).toBe(false);
});

test('changes the given settings and keeps the others', async () => {
	mocks.containers.set(
		sectionGuid,
		collection({
			filter: {
				organization: ['current'],
				organizationalUnit: [''],
				sdg: ['13'],
				status: ['status.in_implementation'],
				type: ['goal']
			},
			listType: 'carousel'
		})
	);

	const output = await update({ categories: { sdg: ['13.2'] }, title: 'Climate targets' });

	expect(mocks.updateContainer).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ guid: sectionGuid }),
		{ afterUpdate: expect.any(Function), expectedRevision: 2 }
	);
	expect(updatedPayload()).toMatchObject({
		filter: {
			organization: ['current'],
			organizationalUnit: [''],
			sdg: ['13.2'],
			status: ['status.in_implementation'],
			type: ['goal']
		},
		listType: 'carousel',
		title: 'Climate targets'
	});
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
		{
			containerGuid: sectionGuid,
			revision: 3,
			tokenId,
			tool: 'update_custom_collection_section',
			userId
		},
		mocks.transactionConnection
	);
	expect(output.section).toMatchObject({
		additionalFilters: { status: ['status.in_implementation'] },
		categories: { sdg: ['13.2'] },
		organizationScope: { includeSubordinateOrganizationalUnits: false, type: 'current' },
		parentGuid: programGuid,
		revision: 3,
		title: 'Climate targets'
	});
});

test('switches to a fixed selection and keeps the filter', async () => {
	mocks.containers.set(sectionGuid, collection({ filter: { type: ['goal'] }, item: [] }));

	const { section } = await update({ items: [goalGuid] });

	expect(updatedPayload()).toMatchObject({ filter: { type: ['goal'] }, item: [goalGuid] });
	expect(section).toMatchObject({ items: [goalGuid], mode: 'items' });
});

test.each([
	['an empty selection', { items: [] }],
	['types', { types: ['measure'] }],
	['categories', { categories: { sdg: ['13'] } }],
	['the organization scope', { includeSubordinateOrganizationalUnits: false }]
])('switches a fixed selection back to the filter for %s', async (_, settings) => {
	mocks.containers.set(sectionGuid, collection({ filter: { type: ['goal'] }, item: [goalGuid] }));

	const { section } = await update(settings);

	expect(updatedPayload()).toMatchObject({ item: [] });
	expect(section).toMatchObject({ items: [], mode: 'filter' });
});

test('keeps a fixed selection when other settings change', async () => {
	mocks.containers.set(sectionGuid, collection({ filter: { type: ['goal'] }, item: [goalGuid] }));

	const { section } = await update({ title: 'Our goals' });

	expect(section).toMatchObject({ items: [goalGuid], mode: 'items', title: 'Our goals' });
});

test('replaces an organization scope chosen in the web application', async () => {
	mocks.containers.set(
		sectionGuid,
		collection({
			filter: { organization: [organizationGuid], organizationalUnit: [unitGuid], type: ['goal'] }
		})
	);

	await expect(update({ title: 'Climate goals' })).resolves.toMatchObject({
		section: {
			organizationScope: {
				organizationalUnits: [unitGuid],
				organizations: [organizationGuid],
				type: 'explicit'
			}
		}
	});

	mocks.updateContainer.mockClear();

	await update({ includeSubordinateOrganizationalUnits: true });

	expect(updatedPayload().filter).toEqual({
		organization: ['current'],
		organizationalUnit: [],
		type: ['goal']
	});
});

test('keeps stored category values the organization no longer offers', async () => {
	mocks.containers.set(sectionGuid, collection({ filter: { sdg: ['retired'], type: ['goal'] } }));

	await update({ categories: { sdg: ['retired', '13'] } });

	expect(updatedPayload().filter).toMatchObject({ sdg: ['retired', '13'] });
	await expect(update({ categories: { sdg: ['99'] } })).rejects.toThrow(
		'Unknown value of category sdg: 99.'
	);
});

test('rejects a stale expected revision before writing', async () => {
	mocks.containers.set(sectionGuid, collection({ filter: { type: ['goal'] } }));

	await expect(update({ title: 'Renamed' }, 1)).rejects.toThrow(
		'The container changed since revision 1.'
	);
	expect(mocks.updateContainer).not.toHaveBeenCalled();
});

test.each([
	['missing', () => {}],
	[
		'hidden',
		() => {
			mocks.containers.set(sectionGuid, collection({}));
			mocks.unreadableGuids.add(sectionGuid);
		}
	],
	[
		'not a custom collection',
		() => mocks.containers.set(sectionGuid, container(sectionGuid, { title: 'Goal', type: 'goal' }))
	]
])('rejects a section that is %s', async (_, arrange) => {
	arrange();

	await expect(update({ title: 'Renamed' })).rejects.toThrow(
		'Custom collection section not found or inaccessible.'
	);
	expect(mocks.updateContainer).not.toHaveBeenCalled();
});

test('requires at least one setting to change in the contract', () => {
	expect(
		updateCustomCollectionSectionInput.safeParse({ expectedRevision: 2, guid: sectionGuid }).success
	).toBe(false);
});

test.each([
	[{ items: [goalGuid], types: ['goal'] }, false],
	[{ categories: { sdg: ['13'] }, items: [goalGuid] }, false],
	[{ includeSubordinateOrganizationalUnits: true, items: [goalGuid] }, false],
	[{ items: [], types: ['goal'] }, true]
])(
	'accepts filter settings with items in the contract only to clear them: %o',
	(settings, valid) => {
		expect(
			updateCustomCollectionSectionInput.safeParse({
				expectedRevision: 2,
				guid: sectionGuid,
				...settings
			}).success
		).toBe(valid);
	}
);
