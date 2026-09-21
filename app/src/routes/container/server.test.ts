import { NotFoundError } from 'slonik';
import { beforeEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
	targets: [] as unknown[],
	create: vi.fn(),
	byGuid: undefined as ((guid: string) => Promise<unknown>) | undefined
}));
vi.mock('$lib/server/db', () => ({
	getManyContainers: () => async () => mocks.targets,
	getManyOrganizationContainers: () => async () => [],
	getContainerByGuid: (guid: string) => async () =>
		mocks.byGuid ? mocks.byGuid(guid) : mocks.targets[0],
	createContainer: (container: unknown) => async () => {
		mocks.create(container);
		return container;
	}
}));
import { locale } from 'svelte-i18n';
import {
	anyContainer,
	composeUserGrants,
	emptyGrantRecords,
	grantRecordsForRoleOn,
	grantSetForRole,
	memberRoles,
	newContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import { POST } from './+server';

locale.set('en');
beforeEach(() => {
	mocks.targets = [];
	mocks.create.mockReset();
	mocks.byGuid = undefined;
});

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const sourceGuid = '00000000-0000-4000-8000-000000000002';
const userGuid = '00000000-0000-4000-8000-000000000003';
const otherOrganizationGuid = '00000000-0000-4000-8000-000000000004';
const unknownGuid = '00000000-0000-4000-8000-00000000dead';

const user = {
	familyName: 'Admin',
	givenName: 'Test',
	grants: emptyGrantRecords(),
	guid: userGuid,
	isAuthenticated: true,
	roles: ['sysadmin'],
	settings: {}
};

test.each([
	['measure', true, 'goal', false],
	['simple_measure', true, 'goal', false],
	['measure', false, 'goal', true],
	['measure', true, 'text', true],
	['measure', true, 'task', true]
] as const)(
	'direct creation in %s with templating=%s and type=%s',
	async (type, enabled, childType, allowed) => {
		mocks.targets = [
			anyContainer.parse({
				guid: sourceGuid,
				managed_by: organizationGuid,
				organization: organizationGuid,
				organizational_unit: null,
				realm: 'realm',
				revision: 1,
				valid_currently: true,
				valid_from: new Date(),
				payload: { type, title: 'Owner' }
			})
		];
		const body = newContainer.parse({
			managed_by: organizationGuid,
			organization: organizationGuid,
			organizational_unit: null,
			realm: 'realm',
			payload: { type: childType, title: 'Child' },
			relation: [{ object: sourceGuid, predicate: 'is-part-of-measure', position: 0 }]
		});
		const result = POST({
			locals: {
				features: enabled ? ['Templating'] : [],
				user,
				pool: { connect: (fn: (connection: unknown) => unknown) => fn({}) }
			},
			request: new Request('http://localhost/container', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			})
		} as never);
		if (allowed) await expect(result).resolves.toMatchObject({ status: 201 });
		else {
			await expect(result).rejects.toMatchObject({ status: 422 });
			expect(mocks.create).not.toHaveBeenCalled();
		}
	}
);

test.each(['measure', 'simple_measure'] as const)(
	'template creation validates %s scope owner',
	async (type) => {
		mocks.targets = [
			anyContainer.parse({
				guid: sourceGuid,
				managed_by: organizationGuid,
				organization: organizationGuid,
				organizational_unit: null,
				realm: 'realm',
				revision: 1,
				valid_currently: true,
				valid_from: new Date(),
				payload: { type, title: 'Owner' }
			})
		];
		const body = newContainer.parse({
			managed_by: organizationGuid,
			organization: organizationGuid,
			organizational_unit: null,
			realm: 'realm',
			payload: { type: 'goal', title: 'Template', template: true },
			relation: [{ object: sourceGuid, predicate: 'is-available-in', position: 0 }]
		});
		const result = POST({
			locals: {
				features: ['Templating'],
				user,
				pool: { connect: async (fn: (connection: unknown) => unknown) => fn({}) }
			},
			request: new Request('http://localhost/container', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			})
		} as never);
		await expect(result).resolves.toMatchObject({ status: 201 });
	}
);

test.each(['is-copy-of', 'is-individual-profile-of'] as const)(
	'ordinary creation rejects client-supplied %s provenance',
	async (predicate) => {
		const body = newContainer.parse({
			managed_by: organizationGuid,
			organization: organizationGuid,
			organizational_unit: null,
			payload: { title: 'Spoofed copy', type: payloadTypes.enum.text },
			realm: 'client-controlled',
			relation: [{ object: sourceGuid, position: 0, predicate }]
		});
		const request = new Request('http://localhost/container', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		});

		await expect(POST({ locals: { pool: {}, user }, request } as never)).rejects.toMatchObject({
			status: 422
		});
	}
);

test('ordinary creation rejects is-available-in relations on non-templates', async () => {
	const body = newContainer.parse({
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload: { template: false, title: 'Not a template', type: payloadTypes.enum.goal },
		realm: 'realm',
		relation: [
			{
				object: sourceGuid,
				position: 0,
				predicate: predicates.enum['is-available-in']
			}
		]
	});
	const request = new Request('http://localhost/container', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' }
	});

	await expect(POST({ locals: { pool: {}, user }, request } as never)).rejects.toMatchObject({
		status: 422
	});
});

test('ordinary creation rejects non-text objects placed directly in a program when templating is enabled', async () => {
	const body = newContainer.parse({
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload: { title: 'Measure', type: payloadTypes.enum.measure },
		realm: 'realm',
		relation: [
			{
				object: sourceGuid,
				position: 0,
				predicate: predicates.enum['is-part-of-program']
			}
		]
	});
	const request = new Request('http://localhost/container', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' }
	});

	await expect(
		POST({ locals: { features: ['Templating'], pool: {}, user }, request } as never)
	).rejects.toMatchObject({
		body: { message: 'error.scoped_template_required' },
		status: 422
	});
});

// —— the parent-derived create guard ————————————————————————————————————————

const headSet = grantSetForRole(memberRoles.enum.head);

function headUser(roles: string[] = []) {
	return {
		familyName: 'Head',
		givenName: 'Test',
		grants: grantRecordsForRoleOn(memberRoles.enum.head, organizationGuid),
		guid: userGuid,
		isAuthenticated: true,
		roles,
		settings: {}
	};
}

// the parent arrives at the guard enriched with the grants of the request
// user — a head of their own organization in these tests
function organization() {
	return {
		guid: organizationGuid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		realm: 'knot-dots',
		payload: { name: 'Org', type: 'organization', visibility: 'public' },
		relation: [],
		user_grant: composeUserGrants({
			scopeSourced: true,
			governsItself: true,
			organizationSelf: headSet.self,
			organizationalUnitSelf: [],
			source: organizationGuid,
			sourceSelf: headSet.self,
			sourceSubordinates: headSet.subordinates
		}),
		user: []
	};
}

function newGoal(organizationValue: string, relation: unknown[] = []) {
	return {
		managed_by: [organizationValue],
		organization: organizationValue,
		organizational_unit: null,
		payload: { title: 'Goal', type: 'goal' },
		realm: 'knot-dots',
		relation,
		user: []
	};
}

function post(body: unknown, roles: string[] = []) {
	const request = new Request('http://localhost/container', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' }
	});

	return POST({
		locals: {
			features: [],
			pool: { connect: (fn: (connection: unknown) => unknown) => fn({}) },
			user: headUser(roles)
		},
		request
	} as never);
}

test('creating within a readable parent of the same organization succeeds', async () => {
	mocks.byGuid = async () => organization();

	const response = await post(newGoal(organizationGuid));

	expect(response.status).toBe(201);
	expect(mocks.create).toHaveBeenCalled();
});

test('a relation pointing at a non-existent parent is refused', async () => {
	mocks.byGuid = async () => {
		throw new NotFoundError('not found', { sql: 'SELECT 1', values: [] });
	};

	await expect(
		post(
			newGoal(otherOrganizationGuid, [
				{ object: unknownGuid, position: 0, predicate: 'is-part-of' }
			])
		)
	).rejects.toMatchObject({ status: 403 });
	expect(mocks.create).not.toHaveBeenCalled();
});

test('a parent from another organization than the persisted one is refused', async () => {
	mocks.byGuid = async () => organization();

	await expect(
		post(
			newGoal(otherOrganizationGuid, [
				{ object: organizationGuid, position: 0, predicate: 'is-part-of' }
			])
		)
	).rejects.toMatchObject({ status: 403 });
	expect(mocks.create).not.toHaveBeenCalled();
});

test('sysadmins may create containers without an existing parent', async () => {
	mocks.byGuid = async () => {
		throw new NotFoundError('not found', { sql: 'SELECT 1', values: [] });
	};

	const response = await post(newGoal(otherOrganizationGuid), ['sysadmin']);

	expect(response.status).toBe(201);
	expect(mocks.create).toHaveBeenCalled();
});
