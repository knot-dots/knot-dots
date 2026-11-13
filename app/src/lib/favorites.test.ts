import type { Page } from '@sveltejs/kit';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const env = vi.hoisted(() => ({}) as Record<string, string>);

vi.mock('$env/dynamic/public', () => ({ env }));

import { createFavoriteURL, resolveFavoriteURL } from '$lib/favorites';
import type { Container, OrganizationalUnitPayload, OrganizationPayload } from '$lib/models';

function organization(
	guid: string,
	payload: Partial<OrganizationPayload> = {}
): Container<OrganizationPayload> {
	return {
		guid,
		organization: guid,
		payload: { default: false, type: 'organization', ...payload }
	} as Container<OrganizationPayload>;
}

function organizationalUnit(
	guid: string,
	organization: string,
	payload: Partial<OrganizationalUnitPayload> = {}
): Container<OrganizationalUnitPayload> {
	return {
		guid,
		organization,
		payload: { type: 'organizational_unit', ...payload }
	} as Container<OrganizationalUnitPayload>;
}

const defaultOrganization = organization('00000000-0000-4000-8000-000000000001', {
	default: true,
	slug: 'platform'
});
const organizationWithSlug = organization('00000000-0000-4000-8000-000000000002', {
	slug: 'springfield'
});
const organizationWithoutSlug = organization('00000000-0000-4000-8000-000000000003');
const organizationWithCustomDomain = organization('00000000-0000-4000-8000-000000000004', {
	customDomain: 'shelbyville.example',
	slug: 'shelbyville'
});
const organizationalUnitWithSlug = organizationalUnit(
	'00000000-0000-4000-8000-000000000011',
	organizationWithSlug.guid,
	{ slug: 'parks' }
);
const organizationalUnitWithoutSlug = organizationalUnit(
	'00000000-0000-4000-8000-000000000012',
	organizationWithSlug.guid
);
const unknownOrganizationGuid = '00000000-0000-4000-8000-000000000099';
const contentGuid = '00000000-0000-4000-8000-000000000021';

const data = {
	organizations: [
		defaultOrganization,
		organizationWithSlug,
		organizationWithoutSlug,
		organizationWithCustomDomain
	],
	organizationalUnits: [organizationalUnitWithSlug, organizationalUnitWithoutSlug]
};

beforeEach(() => {
	for (const key of Object.keys(env)) {
		delete env[key];
	}
	env.PUBLIC_BASE_URL = 'https://knotdots.example';
});

describe('favoriteHrefOf', () => {
	function pageAt(url: string, routeId: Page['route']['id'], params: Page['params'] = {}): Page {
		return {
			data: { currentOrganization: organizationWithSlug } as Page['data'],
			error: null,
			form: null,
			params,
			route: { id: routeId },
			state: {},
			status: 200,
			url: new URL(url) as Page['url']
		};
	}

	test('refers to the organization and the context by their guids', () => {
		expect(
			createFavoriteURL(
				pageAt(
					'https://springfield.knotdots.example/parks/measures/catalog',
					'/[guid=uuid]/measures/catalog',
					{
						guid: organizationalUnitWithSlug.guid
					}
				)
			)
		).toBe(
			`knotdots://${organizationWithSlug.guid}/${organizationalUnitWithSlug.guid}/measures/catalog`
		);
	});

	test('keeps the guid of the content', () => {
		expect(
			createFavoriteURL(
				pageAt(
					`https://springfield.knotdots.example/springfield/${contentGuid}`,
					'/[guid=uuid]/[contentGuid=uuid]',
					{ contentGuid, guid: organizationWithSlug.guid }
				)
			)
		).toBe(`knotdots://${organizationWithSlug.guid}/${organizationWithSlug.guid}/${contentGuid}`);
	});

	test('keeps the path of routes without context', () => {
		expect(
			createFavoriteURL(pageAt('https://springfield.knotdots.example/me/tasks', '/me/tasks'))
		).toBe(`knotdots://${organizationWithSlug.guid}/me/tasks`);
	});

	test('normalizes the query and drops the hash', () => {
		expect(
			createFavoriteURL(
				pageAt(
					'https://springfield.knotdots.example/springfield/measures/catalog?terms=a%20b&sort=alpha#view=x',
					'/[guid=uuid]/measures/catalog',
					{ guid: organizationWithSlug.guid }
				)
			)
		).toBe(
			`knotdots://${organizationWithSlug.guid}/${organizationWithSlug.guid}/measures/catalog?terms=a+b&sort=alpha`
		);
	});
});

describe('favoriteURL', () => {
	test('uses the hostname of the base URL and the slug of the default organization', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${defaultOrganization.guid}/${defaultOrganization.guid}/goals`,
				data
			)
		).toBe('https://knotdots.example/platform/goals');
	});

	test('uses the slugs of an organization with slug', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithSlug.guid}/${organizationWithSlug.guid}`,
				data
			)
		).toBe('https://springfield.knotdots.example/springfield');
	});

	test('uses the guids of an organization without slug', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithoutSlug.guid}/${organizationWithoutSlug.guid}`,
				data
			)
		).toBe(
			`https://${organizationWithoutSlug.guid}.knotdots.example/${organizationWithoutSlug.guid}`
		);
	});

	test('uses the custom domain of an organization', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithCustomDomain.guid}/${organizationWithCustomDomain.guid}/measures`,
				data
			)
		).toBe('https://shelbyville.example/shelbyville/measures');
	});

	test('uses the slug of an organizational unit on the host of its organization', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithSlug.guid}/${organizationalUnitWithSlug.guid}/measures?sort=alpha`,
				data
			)
		).toBe('https://springfield.knotdots.example/parks/measures?sort=alpha');
	});

	test('keeps the guid of an organizational unit without slug', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithSlug.guid}/${organizationalUnitWithoutSlug.guid}`,
				data
			)
		).toBe(`https://springfield.knotdots.example/${organizationalUnitWithoutSlug.guid}`);
	});

	test('keeps the guid of the content', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithSlug.guid}/${organizationWithSlug.guid}/${contentGuid}`,
				data
			)
		).toBe(`https://springfield.knotdots.example/springfield/${contentGuid}`);
	});

	test('keeps the guid of an organizational unit of another organization', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithoutSlug.guid}/${organizationalUnitWithSlug.guid}`,
				data
			)
		).toBe(
			`https://${organizationWithoutSlug.guid}.knotdots.example/${organizationalUnitWithSlug.guid}`
		);
	});

	test('uses the guid subdomain of an unknown organization', () => {
		expect(
			resolveFavoriteURL(
				`knotdots://${unknownOrganizationGuid}/${unknownOrganizationGuid}/goals`,
				data
			)
		).toBe(`https://${unknownOrganizationGuid}.knotdots.example/${unknownOrganizationGuid}/goals`);
	});

	test('links pages without context on the host of the organization', () => {
		expect(resolveFavoriteURL(`knotdots://${organizationWithSlug.guid}/me/tasks`, data)).toBe(
			'https://springfield.knotdots.example/me/tasks'
		);
	});

	test('uses the protocol and port of the base URL', () => {
		env.PUBLIC_BASE_URL = 'http://knotdots.localhost:5173';

		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithSlug.guid}/${organizationWithSlug.guid}`,
				data
			)
		).toBe('http://springfield.knotdots.localhost:5173/springfield');
	});

	test('keeps guids and the base URL without subdomains', () => {
		env.PUBLIC_BASE_URL = 'http://localhost:5173';
		env.PUBLIC_DONT_USE_SUBDOMAINS = 't';

		expect(
			resolveFavoriteURL(
				`knotdots://${organizationWithSlug.guid}/${organizationalUnitWithSlug.guid}/measures`,
				data
			)
		).toBe(`http://localhost:5173/${organizationalUnitWithSlug.guid}/measures`);
	});

	test('returns hrefs in another form unchanged', () => {
		expect(resolveFavoriteURL('/springfield/measures', data)).toBe('/springfield/measures');
		expect(resolveFavoriteURL('https://example.com/', data)).toBe('https://example.com/');
	});
});
