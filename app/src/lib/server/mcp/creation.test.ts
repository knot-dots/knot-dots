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
	relations: [] as Array<{ object: string; position: number; predicate: string }>
}));

vi.mock('$lib/authorization', () => ({
	default: () => ({ can: () => true, cannot: () => false })
}));
vi.mock('$lib/server/containerCreation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/containerCreation')>()),
	createAuthorizedContainer: mocks.createAuthorizedContainer
}));
vi.mock('$lib/server/db', () => ({
	getAllDirectContainerRelations: () => async () => mocks.relations,
	getContainerByGuid: (guid: string) => async () => mocks.containers.get(guid)
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

import {
	addMcpCustomCollectionSection,
	createMcpPage,
	McpCreationError
} from '$lib/server/mcp/creation';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const pageGuid = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';
const createdGuid = '00000000-0000-4000-8000-000000000004';

function container(
	guid: string,
	payload:
		| { name: string; type: 'organization' }
		| { body: string; title: string; type: 'page'; visibility: 'organization' }
): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload,
		realm: 'test',
		relation: [],
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
	mocks.createAuthorizedContainer.mockReset();
	mocks.createAuthorizedContainer.mockImplementation(({ data }) => async () => ({
		...data,
		guid: createdGuid
	}));
});

test('creates a page through the shared authorized creation service', async () => {
	await expect(
		createMcpPage({
			body: '<p>Climate indicators</p>',
			organizationGuid,
			organizationalUnitGuid: null,
			title: 'Climate indicators',
			userId,
			visibility: 'organization'
		})({} as never)
	).resolves.toEqual({
		page: {
			guid: createdGuid,
			organizationGuid,
			organizationalUnitGuid: null,
			title: 'Climate indicators',
			visibility: 'organization'
		}
	});

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith({
		data: expect.objectContaining({
			managed_by: [organizationGuid],
			organization: organizationGuid,
			organizational_unit: null,
			payload: expect.objectContaining({
				body: '<p>Climate indicators</p>',
				title: 'Climate indicators',
				type: 'page',
				visibility: 'organization'
			})
		}),
		features: [],
		user: expect.objectContaining({ guid: userId })
	});
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
		userId
	})({} as never);

	expect(mocks.createAuthorizedContainer).toHaveBeenCalledWith({
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
});

test('rejects category values that are not available for the selected types', async () => {
	await expect(
		addMcpCustomCollectionSection({
			categories: { sdg: ['99'] },
			includeSubordinateOrganizationalUnits: false,
			pageGuid,
			title: 'Objekte einbinden',
			types: ['indicator_template'],
			userId
		})({} as never)
	).rejects.toEqual(expect.any(McpCreationError));
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});
