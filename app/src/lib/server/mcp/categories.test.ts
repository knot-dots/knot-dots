import { beforeEach, expect, test, vi } from 'vitest';
import { emptyGrantRecords } from '$lib/models';

const getManyOrganizationContainers = vi.hoisted(() => vi.fn());
const loadCategoryContext = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/categoryOptions', () => ({ loadCategoryContext }));
vi.mock('$lib/server/db', () => ({ getManyOrganizationContainers }));
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
	listMcpContainerCategories,
	listMcpContainerCategoryValues
} from '$lib/server/mcp/categories';

// Categories are identified by the GUID of their category container and
// their values by the GUID of their term container.
const sdg = {
	climateAction: '00000000-0000-4000-8000-0000000000c2',
	environment: '00000000-0000-4000-8000-0000000000c3',
	key: '00000000-0000-4000-8000-0000000000c1'
};
const programKindKey = '00000000-0000-4000-8000-0000000000d1';
const organizationGuid = '00000000-0000-4000-8000-000000000001';
const defaultOrganizationGuid = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';

beforeEach(() => {
	getManyOrganizationContainers.mockReset();
	getManyOrganizationContainers.mockReturnValue(async () => [{ guid: defaultOrganizationGuid }]);
	loadCategoryContext.mockReset();
	loadCategoryContext.mockResolvedValue({
		keys: [sdg.key, programKindKey],
		labels: new Map([
			[sdg.key, 'Sustainable Development Goal'],
			[programKindKey, 'Program kind']
		]),
		objectTypesPerKey: {
			[programKindKey]: ['program'],
			[sdg.key]: ['indicator']
		},
		options: {
			[programKindKey]: [],
			[sdg.key]: [
				{
					label: 'Environment',
					subOptions: [{ label: 'Climate action', value: sdg.climateAction }],
					value: sdg.environment
				}
			]
		}
	});
});

test('lists category metadata using union semantics for requested types', async () => {
	await expect(
		listMcpContainerCategories({
			organizationGuid,
			types: ['indicator', 'binary_indicator'],
			userId
		})({} as never)
	).resolves.toEqual({
		categories: [
			{
				applicableTypes: ['indicator'],
				key: sdg.key,
				label: 'Sustainable Development Goal',
				valueCount: 2
			}
		]
	});
	expect(loadCategoryContext).toHaveBeenCalledWith({
		connect: expect.any(Function),
		scope: [organizationGuid, defaultOrganizationGuid],
		user: expect.objectContaining({ guid: userId })
	});
});

test('searches and paginates values for one category', async () => {
	await expect(
		listMcpContainerCategoryValues({
			categoryKey: sdg.key,
			limit: 1,
			offset: 0,
			organizationGuid,
			terms: undefined,
			types: ['indicator'],
			userId
		})({} as never)
	).resolves.toEqual({
		category: { key: sdg.key, label: 'Sustainable Development Goal' },
		nextOffset: 1,
		values: [{ label: 'Environment', parentValue: null, value: sdg.environment }]
	});

	await expect(
		listMcpContainerCategoryValues({
			categoryKey: sdg.key,
			limit: 50,
			offset: 0,
			organizationGuid,
			terms: 'climate',
			types: ['indicator'],
			userId
		})({} as never)
	).resolves.toEqual({
		category: { key: sdg.key, label: 'Sustainable Development Goal' },
		nextOffset: null,
		values: [{ label: 'Climate action', parentValue: sdg.environment, value: sdg.climateAction }]
	});
});
