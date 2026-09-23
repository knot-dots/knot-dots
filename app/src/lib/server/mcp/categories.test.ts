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

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const defaultOrganizationGuid = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';

beforeEach(() => {
	getManyOrganizationContainers.mockReset();
	getManyOrganizationContainers.mockReturnValue(async () => [{ guid: defaultOrganizationGuid }]);
	loadCategoryContext.mockReset();
	loadCategoryContext.mockResolvedValue({
		keys: ['sdg', 'programKind'],
		labels: new Map([
			['sdg', 'Sustainable Development Goal'],
			['programKind', 'Program kind']
		]),
		objectTypesPerKey: {
			programKind: ['program'],
			sdg: ['indicator_template']
		},
		options: {
			__categoryLabels__: {
				programKind: 'Program kind',
				sdg: 'Sustainable Development Goal'
			},
			programKind: [],
			sdg: [
				{
					guid: '00000000-0000-4000-8000-000000000004',
					label: 'Environment',
					subOptions: [
						{
							guid: '00000000-0000-4000-8000-000000000005',
							label: 'Climate action',
							value: '13'
						}
					],
					value: 'environment'
				}
			]
		}
	});
});

test('lists category metadata using union semantics for requested types', async () => {
	await expect(
		listMcpContainerCategories({
			organizationGuid,
			types: ['indicator_template', 'binary_indicator'],
			userId
		})({} as never)
	).resolves.toEqual({
		categories: [
			{
				applicableTypes: ['indicator_template'],
				key: 'sdg',
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
			categoryKey: 'sdg',
			limit: 1,
			offset: 0,
			organizationGuid,
			terms: undefined,
			types: ['indicator_template'],
			userId
		})({} as never)
	).resolves.toEqual({
		category: { key: 'sdg', label: 'Sustainable Development Goal' },
		nextOffset: 1,
		values: [{ label: 'Environment', parentValue: null, value: 'environment' }]
	});

	await expect(
		listMcpContainerCategoryValues({
			categoryKey: 'sdg',
			limit: 50,
			offset: 0,
			organizationGuid,
			terms: 'climate',
			types: ['indicator_template'],
			userId
		})({} as never)
	).resolves.toEqual({
		category: { key: 'sdg', label: 'Sustainable Development Goal' },
		nextOffset: null,
		values: [{ label: 'Climate action', parentValue: 'environment', value: '13' }]
	});
});
