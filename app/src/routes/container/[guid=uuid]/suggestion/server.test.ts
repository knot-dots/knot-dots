import { NotFoundError } from 'slonik';
import { beforeEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
	containers: new Map<string, unknown>(),
	indicators: [] as unknown[]
}));
vi.mock('$lib/server/db', () => ({
	getAllContainersRelatedToIndicators: () => async () => [],
	getContainerByGuid: (guid: string) => async () => {
		if (!mocks.containers.has(guid)) {
			throw new NotFoundError('not found', { sql: 'SELECT 1', values: [] });
		}
		return mocks.containers.get(guid);
	},
	getManyContainers: (_: unknown, filters: { type?: string[] }) => async () =>
		filters.type?.includes('indicator') ? mocks.indicators : [],
	getManyOrganizationContainers: () => async () => []
}));
import { locale } from 'svelte-i18n';
import {
	composeUserGrants,
	grantRecordsForRoleOn,
	grantSetForRole,
	memberRoles
} from '$lib/models';
import { GET } from './+server';

locale.set('en');

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const measureGuid = '00000000-0000-4000-8000-000000000002';
const userGuid = '00000000-0000-4000-8000-000000000003';

function stored(guid: string, payload: Record<string, unknown>) {
	const set = grantSetForRole(memberRoles.enum.head);
	return {
		guid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload: { category: {}, visibility: 'members', ...payload },
		realm: 'knot-dots',
		relation: [],
		revision: 1,
		user: [],
		user_grant: composeUserGrants({
			scopeSourced: true,
			governsItself: true,
			organizationSelf: set.self,
			organizationalUnitSelf: [],
			sources: [{ guid: organizationGuid, self: set.self, subordinates: set.subordinates }]
		}),
		valid_currently: true,
		valid_from: new Date()
	};
}

function indicator(index: number, indicatorCategory: string) {
	return stored(`00000000-0000-4000-8000-00000000010${index}`, {
		indicatorCategory: [indicatorCategory],
		title: `Indicator ${index}`,
		type: 'indicator',
		unit: 'unit.percent'
	});
}

beforeEach(() => {
	mocks.containers = new Map([
		[measureGuid, stored(measureGuid, { title: 'Measure', type: 'measure' })]
	]);
	mocks.indicators = [
		indicator(1, 'indicator_category.custom'),
		indicator(2, 'indicator_category.custom'),
		indicator(3, 'indicator_category.sdg')
	];
});

function get(query: string) {
	return GET({
		locals: {
			pool: { connect: (fn: (connection: unknown) => unknown) => fn({}) },
			user: {
				familyName: 'Head',
				givenName: 'Test',
				grants: grantRecordsForRoleOn(memberRoles.enum.head, organizationGuid),
				guid: userGuid,
				isAuthenticated: true,
				roles: [],
				settings: {}
			}
		},
		params: { guid: measureGuid },
		url: new URL(`http://localhost/container/${measureGuid}/suggestion?${query}`)
	} as never);
}

test('suggestions are returned page by page', async () => {
	const first = await (await get('limit=2&offset=0')).json();

	expect(first.suggestions).toHaveLength(2);
	expect(first.page).toEqual({ hasMore: true, limit: 2, nextOffset: 2, offset: 0, total: 3 });

	const second = await (await get('limit=2&offset=2')).json();

	expect(second.suggestions).toHaveLength(1);
	expect(second.page).toEqual({ hasMore: false, limit: 2, nextOffset: null, offset: 2, total: 3 });
});

test('facets count all suggestions, not only those of the page', async () => {
	const { facets } = await (await get('limit=1')).json();

	expect(facets.indicatorCategory).toMatchObject({
		'indicator_category.custom': 2,
		'indicator_category.sdg': 1
	});
});

test('suggestions for a target the user may not read are not found', async () => {
	mocks.containers.set(measureGuid, {
		...stored(measureGuid, { title: 'Measure', type: 'measure' }),
		user_grant: composeUserGrants({
			scopeSourced: false,
			governsItself: false,
			organizationSelf: [],
			organizationalUnitSelf: [],
			sources: [{ guid: organizationGuid, self: [], subordinates: [] }]
		})
	});

	await expect(get('')).rejects.toMatchObject({ status: 404 });
});

test('suggestions for a target that does not exist are not found', async () => {
	mocks.containers.clear();

	await expect(get('')).rejects.toMatchObject({ status: 404 });
});
