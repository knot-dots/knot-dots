import { beforeEach, describe, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const {
	getAdoptedContainerGuids,
	getManyContainersWithES,
	loadApplicationContext,
	loadCategoryContext
} = vi.hoisted(() => ({
	getAdoptedContainerGuids: vi.fn(),
	getManyContainersWithES: vi.fn(),
	loadApplicationContext: vi.fn(),
	loadCategoryContext: vi.fn()
}));

vi.mock('$lib/server/applicationContext', () => ({
	loadApplicationContext
}));

vi.mock('$lib/server/categoryOptions', () => ({
	loadCategoryContext
}));

vi.mock('$lib/server/db', () => ({
	getAdoptedContainerGuids,
	getAllRelatedContainers: vi.fn(),
	getManyContainers: vi.fn(),
	getManyOrganizationContainers: vi.fn(() => async () => [])
}));

vi.mock('$lib/server/elasticsearch', () => ({
	getManyContainersWithES
}));

import { createContainerPageQuery, loadContainerV2 } from '$lib/server/containerQuery';

locale.set('en');

const categoryContext = {
	keys: [],
	labels: new Map(),
	objectTypesPerKey: {},
	options: {}
};

beforeEach(() => {
	getAdoptedContainerGuids.mockReset();
	loadApplicationContext.mockReset();
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

describe('createContainerPageQuery', () => {
	const organization = '00000000-0000-4000-8000-000000000010';
	const applicationContext = {
		categoryContext,
		currentOrganization: { guid: organization, payload: { default: false } },
		currentOrganizationalUnit: undefined,
		organizationalUnits: []
	} as never;

	function createLocals(features: string[] = []) {
		const connect = vi.fn(async (operation: (connection: object) => Promise<unknown>) =>
			operation({})
		);
		return {
			features,
			pool: { connect },
			user: { isAuthenticated: false }
		} as never;
	}

	test('scopes queries to the given application context without loading it', async () => {
		const queryContainerPage = await createContainerPageQuery(createLocals(), applicationContext);

		await queryContainerPage(new URLSearchParams('type=goal&hierarchyLevel=2'), {
			limit: 50,
			offset: 0
		});

		expect(loadApplicationContext).not.toHaveBeenCalled();
		expect(loadCategoryContext).not.toHaveBeenCalled();
		expect(getManyContainersWithES).toHaveBeenCalledWith(
			[organization],
			expect.objectContaining({
				hierarchyLevels: [2],
				organizationalUnits: [],
				type: ['goal']
			}),
			'alpha',
			expect.objectContaining({ includeFacets: true })
		);
	});

	test('looks up the adopted containers once for all queries', async () => {
		const adopted = '00000000-0000-4000-8000-000000000020';
		getAdoptedContainerGuids.mockReturnValue(async () => [adopted]);

		const queryContainerPage = await createContainerPageQuery(
			createLocals(['Adoptions']),
			applicationContext
		);
		await Promise.all([
			queryContainerPage(new URLSearchParams('type=goal'), { limit: 50, offset: 0 }),
			queryContainerPage(new URLSearchParams('type=measure'), { limit: 50, offset: 0 })
		]);

		expect(getAdoptedContainerGuids).toHaveBeenCalledOnce();
		expect(getAdoptedContainerGuids).toHaveBeenCalledWith([organization]);
		expect(getManyContainersWithES).toHaveBeenCalledTimes(2);
		expect(getManyContainersWithES).toHaveBeenCalledWith(
			[organization],
			expect.objectContaining({ includeGuids: [adopted] }),
			'alpha',
			expect.anything()
		);
	});

	test('pages through the visible containers and returns the facets as maps', async () => {
		const containers = ['a', 'b', 'c'].map((title, index) => ({
			guid: `00000000-0000-4000-8000-00000000003${index}`,
			payload: { title, type: 'goal', visibility: 'public' },
			relation: [],
			user: []
		}));
		getManyContainersWithES.mockResolvedValue({
			containers,
			facets: { status: { 'status.idea': 3 } },
			total: 3
		});

		const queryContainerPage = await createContainerPageQuery(createLocals(), applicationContext);
		const result = await queryContainerPage(new URLSearchParams('type=goal&limit=1&offset=2'), {
			limit: 2,
			offset: 1
		});

		expect(result.containers).toEqual(containers.slice(1, 3));
		expect(result.page).toEqual({
			hasMore: false,
			limit: 2,
			nextOffset: null,
			offset: 1,
			total: 3
		});
		expect(result.facets.get('status')?.get('status.idea')).toBe(3);
	});
});
