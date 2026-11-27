import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const { getManyContainersWithES, loadCategoryContext } = vi.hoisted(() => ({
	getManyContainersWithES: vi.fn(),
	loadCategoryContext: vi.fn()
}));

vi.mock('$lib/server/applicationContext', () => ({
	loadApplicationContext: vi.fn()
}));

vi.mock('$lib/server/categoryOptions', () => ({
	loadCategoryContext
}));

vi.mock('$lib/server/db', () => ({
	getAdoptedContainerGuids: vi.fn(),
	getAllRelatedContainers: vi.fn(),
	getManyContainers: vi.fn(),
	getManyOrganizationContainers: vi.fn(() => async () => [])
}));

vi.mock('$lib/server/elasticsearch', () => ({
	getManyContainersWithES
}));

vi.mock(import('$lib/authorization'), async (importOriginal) => ({
	...(await importOriginal()),
	filterVisible: (containers) => containers
}));

import { loadContainerGroupsV2, loadContainerV2 } from '$lib/server/containerQuery';

locale.set('en');

const categoryContext = {
	keys: [],
	labels: new Map(),
	objectTypesPerKey: {},
	options: {}
};

beforeEach(() => {
	getManyContainersWithES.mockReset();
	getManyContainersWithES.mockResolvedValue({ containers: [], facets: {}, total: 0 });
	loadCategoryContext.mockReset();
	loadCategoryContext.mockResolvedValue(categoryContext);
});

test('passes availableIn to the v2 Elasticsearch filter', async () => {
	const availableIn = '00000000-0000-4000-8000-000000000001';
	const connect = vi.fn(async (operation: (connection: object) => Promise<unknown>) =>
		operation({})
	);

	await loadContainerV2({
		locals: {
			pool: { connect },
			user: { isAuthenticated: false }
		} as never,
		url: new URL(
			`http://localhost/container/v2?availableIn=${availableIn}&template=true&type=report`
		)
	});

	expect(getManyContainersWithES).toHaveBeenCalledOnce();
	expect(getManyContainersWithES).toHaveBeenCalledWith(
		[],
		expect.objectContaining({ availableIn, template: true, type: ['report'] }),
		'alpha',
		expect.objectContaining({ includeFacets: true })
	);
});

test('rejects availableIn without template=true', async () => {
	await expect(
		loadContainerV2({
			locals: {} as never,
			url: new URL('http://localhost/container/v2?availableIn=00000000-0000-4000-8000-000000000001')
		})
	).rejects.toMatchObject({ status: 400 });
});

test('passes templateRoot to Elasticsearch only for template queries', async () => {
	const connect = vi.fn(async (operation: (connection: object) => Promise<unknown>) =>
		operation({})
	);

	await loadContainerV2({
		locals: { pool: { connect }, user: { isAuthenticated: false } } as never,
		url: new URL('http://localhost/container/v2?template=true&templateRoot=true&type=report')
	});

	expect(getManyContainersWithES).toHaveBeenCalledWith(
		[],
		expect.objectContaining({ template: true, templateRoot: true, type: ['report'] }),
		'alpha',
		expect.objectContaining({ includeFacets: true })
	);

	await expect(
		loadContainerV2({
			locals: {} as never,
			url: new URL('http://localhost/container/v2?templateRoot=true')
		})
	).rejects.toMatchObject({ status: 400 });
});

test('omits facets if they are not requested', async () => {
	const connect = vi.fn(async (operation: (connection: object) => Promise<unknown>) =>
		operation({})
	);
	getManyContainersWithES.mockResolvedValue({
		containers: [],
		facets: { status: { 'status.idea': 1 } },
		total: 0
	});

	const response = await loadContainerV2({
		locals: { pool: { connect }, user: { isAuthenticated: false } } as never,
		url: new URL('http://localhost/container/v2?facets=false&type=goal')
	});

	expect(getManyContainersWithES).toHaveBeenCalledWith(
		[],
		expect.objectContaining({ type: ['goal'] }),
		'alpha',
		expect.objectContaining({ includeFacets: false })
	);
	expect(response.facets).toEqual({});
});

test('pages the groups of the containers found with a single search', async () => {
	const connect = vi.fn(async (operation: (connection: object) => Promise<unknown>) =>
		operation({})
	);
	const containers = [
		{ guid: '00000000-0000-4000-8000-000000000001', payload: { type: 'program' }, relation: [] },
		{ guid: '00000000-0000-4000-8000-000000000002', payload: { type: 'goal' }, relation: [] },
		{
			guid: '00000000-0000-4000-8000-000000000003',
			payload: { hierarchyLevel: 2, type: 'goal' },
			relation: []
		},
		{
			guid: '00000000-0000-4000-8000-000000000004',
			payload: { type: 'goal' },
			relation: [
				{
					object: '00000000-0000-4000-8000-000000000005',
					position: 0,
					predicate: 'is-part-of-measure',
					subject: '00000000-0000-4000-8000-000000000004'
				}
			]
		},
		{ guid: '00000000-0000-4000-8000-000000000006', payload: { type: 'goal' }, relation: [] }
	];
	getManyContainersWithES.mockResolvedValue({
		containers,
		facets: { status: { 'status.idea': 5 } },
		total: containers.length
	});

	const response = await loadContainerGroupsV2({
		locals: { pool: { connect }, user: { isAuthenticated: false } } as never,
		url: new URL(
			'http://localhost/container/v2/groups?type=goal&type=program&limit=1' +
				'&group=type:program' +
				'&group=type:goal,hierarchyLevel:1,excludeRelation:is-part-of-measure' +
				'&group=type:goal,hierarchyLevel:3'
		)
	});

	expect(getManyContainersWithES).toHaveBeenCalledOnce();
	expect(getManyContainersWithES).toHaveBeenCalledWith(
		[],
		expect.objectContaining({ excludeRelation: [] }),
		'alpha',
		expect.objectContaining({ includeFacets: true })
	);
	expect(response.groups.map(({ containers }) => containers.map(({ guid }) => guid))).toEqual([
		['00000000-0000-4000-8000-000000000001'],
		['00000000-0000-4000-8000-000000000002'],
		[]
	]);
	expect(response.groups.map(({ page }) => page)).toEqual([
		{ hasMore: false, limit: 1, nextOffset: null, offset: 0, total: 1 },
		{ hasMore: true, limit: 1, nextOffset: 1, offset: 0, total: 2 },
		{ hasMore: false, limit: 1, nextOffset: null, offset: 0, total: 0 }
	]);
	expect(response.facets.status).toMatchObject({ 'status.idea': 5 });
});

test('rejects groups with unknown fields', async () => {
	await expect(
		loadContainerGroupsV2({
			locals: {} as never,
			url: new URL('http://localhost/container/v2/groups?group=terms:climate')
		})
	).rejects.toMatchObject({ status: 400 });

	await expect(
		loadContainerGroupsV2({
			locals: {} as never,
			url: new URL('http://localhost/container/v2/groups?type=goal')
		})
	).rejects.toMatchObject({ status: 400 });

	expect(getManyContainersWithES).not.toHaveBeenCalled();
});
