import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const mocks = vi.hoisted(() => ({
	container: undefined as unknown,
	updateContainer: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	getAllContainerRevisionsByGuid: () => async () => [mocks.container],
	getContainerByGuid: () => async () => mocks.container,
	updateContainer: mocks.updateContainer
}));

import { anyContainer, payloadTypes, predicates, visibility } from '$lib/models';
import { POST } from './+server';

locale.set('en');

const containerGuid = '00000000-0000-4000-8000-000000000001';
const sourceGuid = '00000000-0000-4000-8000-000000000002';
const organizationGuid = '00000000-0000-4000-8000-000000000003';
const userGuid = '00000000-0000-4000-8000-000000000004';
const sysadmin = {
	adminOf: [],
	collaboratorOf: [],
	familyName: 'Admin',
	givenName: 'Test',
	guid: userGuid,
	headOf: [],
	isAuthenticated: true,
	memberOf: [],
	roles: ['sysadmin'],
	settings: {}
};

beforeEach(() => {
	mocks.updateContainer.mockReset();
	mocks.updateContainer.mockImplementation((updated: unknown) => async () => updated);
	mocks.container = anyContainer.parse({
		guid: containerGuid,
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload: {
			title: 'Container',
			type: payloadTypes.enum.text,
			visibility: visibility.enum.public
		},
		realm: 'realm',
		relation: [],
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-01-01T00:00:00.000Z')
	});
});

function event(predicate: 'is-copy-of' | 'is-individual-profile-of', user = sysadmin) {
	const body = {
		...(mocks.container as Record<string, unknown>),
		relation: [{ object: sourceGuid, position: 0, predicate, subject: containerGuid }]
	};
	return {
		locals: {
			pool: { connect: async (operation: (connection: unknown) => unknown) => operation({}) },
			user
		},
		params: { guid: containerGuid },
		request: new Request(`http://localhost/container/${containerGuid}/revision`, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		})
	} as never;
}

test.each(['is-copy-of', 'is-individual-profile-of'] as const)(
	'revisions reject newly submitted %s provenance',
	async (predicate) => {
		await expect(POST(event(predicate))).rejects.toMatchObject({ status: 422 });
	}
);

test('checks update authorization before server-owned relation validation', async () => {
	await expect(POST(event('is-copy-of', { ...sysadmin, roles: [] }))).rejects.toMatchObject({
		status: 403
	});
});

function scopedTemplate() {
	return anyContainer.parse({
		guid: containerGuid,
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload: {
			template: true,
			title: 'Scoped template',
			type: payloadTypes.enum.goal,
			visibility: visibility.enum.public
		},
		realm: 'realm',
		relation: [
			{
				object: sourceGuid,
				position: 0,
				predicate: predicates.enum['is-available-in'],
				subject: containerGuid
			}
		],
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-01-01T00:00:00.000Z')
	});
}

function revisionEvent(body: unknown) {
	return {
		locals: {
			pool: { connect: async (operation: (connection: unknown) => unknown) => operation({}) },
			user: sysadmin
		},
		params: { guid: containerGuid },
		request: new Request(`http://localhost/container/${containerGuid}/revision`, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		})
	} as never;
}

test('scoped templates cannot be changed into ordinary containers', async () => {
	const container = scopedTemplate();
	mocks.container = container;

	await expect(
		POST(
			revisionEvent({
				...container,
				payload: { ...container.payload, template: false }
			})
		)
	).rejects.toMatchObject({
		body: { message: 'error.unprocessable_entity' },
		status: 422
	});
});

test('scoped templates cannot be moved to another program', async () => {
	const container = scopedTemplate();
	mocks.container = container;

	await expect(
		POST(
			revisionEvent({
				...container,
				relation: container.relation.map((relation) => ({
					...relation,
					object: organizationGuid
				}))
			})
		)
	).rejects.toMatchObject({ status: 422 });
});

test('omitted protected availability relations are restored', async () => {
	const container = scopedTemplate();
	mocks.container = container;

	const response = await POST(
		revisionEvent({
			...container,
			relation: []
		})
	);

	expect(response.status).toBe(201);
	expect(mocks.updateContainer).toHaveBeenCalledWith(
		expect.objectContaining({ relation: container.relation })
	);
});
