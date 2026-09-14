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

import { loadContainerV2 } from '$lib/server/containerQuery';

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
