import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	env: {
		PUBLIC_BASE_URL: 'http://localhost:5173',
		PUBLIC_DONT_USE_SUBDOMAINS: ''
	},
	getManyOrganizationContainers: vi.fn(() => 'organizations'),
	getManyOrganizationalUnitContainers: vi.fn(() => 'organizationalUnits')
}));

vi.mock('$env/dynamic/public', () => ({ env: mocks.env }));
vi.mock('$lib/server/db', () => ({
	getManyOrganizationContainers: mocks.getManyOrganizationContainers,
	getManyOrganizationalUnitContainers: mocks.getManyOrganizationalUnitContainers
}));

import { GET } from './+server';

const defaultOrganizationGuid = '00000000-0000-4000-8000-000000000001';
const organizationGuid = '00000000-0000-4000-8000-000000000002';
const defaultOrganizationalUnitGuid = '00000000-0000-4000-8000-000000000003';
const organizationalUnitGuid = '00000000-0000-4000-8000-000000000004';

const organizations = [
	{
		guid: defaultOrganizationGuid,
		payload: { default: true, slug: 'default-organization', type: 'organization' }
	},
	{
		guid: organizationGuid,
		payload: {
			customDomain: 'example.org',
			default: false,
			slug: 'demobereich',
			type: 'organization'
		}
	}
];

const organizationalUnits = [
	{
		guid: defaultOrganizationalUnitGuid,
		organization: defaultOrganizationGuid,
		payload: { slug: 'default-unit', type: 'organizational_unit' }
	},
	{
		guid: organizationalUnitGuid,
		organization: organizationGuid,
		payload: { slug: 'demo-unit', type: 'organizational_unit' }
	}
];

async function getRewriteMap() {
	const connect = vi.fn(async (operation: string) => {
		if (operation === 'organizations') return organizations;
		if (operation === 'organizationalUnits') return organizationalUnits;
		throw new Error(`Unexpected database operation: ${operation}`);
	});

	const response = await GET({ locals: { pool: { connect } } } as never);
	return response.json();
}

beforeEach(() => {
	mocks.env.PUBLIC_DONT_USE_SUBDOMAINS = '';
});

test('maps each organization on its own host when subdomains are enabled', async () => {
	const rewriteMap = await getRewriteMap();

	expect(rewriteMap.localhost).toEqual({
		'default-organization': defaultOrganizationGuid,
		'default-unit': defaultOrganizationalUnitGuid
	});
	expect(rewriteMap[`${organizationGuid}.localhost`]).toEqual({
		demobereich: organizationGuid,
		'demo-unit': organizationalUnitGuid
	});
	expect(rewriteMap['demobereich.localhost']).toEqual(rewriteMap[`${organizationGuid}.localhost`]);
});

test('merges all slugs onto the base host when subdomains are disabled', async () => {
	mocks.env.PUBLIC_DONT_USE_SUBDOMAINS = 't';

	const rewriteMap = await getRewriteMap();

	expect(rewriteMap.localhost).toEqual({
		'default-organization': defaultOrganizationGuid,
		'default-unit': defaultOrganizationalUnitGuid,
		demobereich: organizationGuid,
		'demo-unit': organizationalUnitGuid
	});
	expect(rewriteMap).not.toHaveProperty(`${organizationGuid}.localhost`);
	expect(rewriteMap).not.toHaveProperty('demobereich.localhost');
});
