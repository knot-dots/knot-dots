import { NotFoundError } from 'slonik';
import { beforeEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
	containers: new Map<string, unknown>(),
	create: vi.fn(),
	indexed: vi.fn()
}));
vi.mock('$lib/server/db', () => ({
	getContainerByGuid: (guid: string) => async () => {
		if (!mocks.containers.has(guid)) {
			throw new NotFoundError('not found', { sql: 'SELECT 1', values: [] });
		}
		return mocks.containers.get(guid);
	},
	createManyContainers:
		(inserts: Array<{ guid: string; relation: Array<{ object: string; subject: string }> }>) =>
		async () => {
			for (const container of inserts) {
				mocks.create(container);
				mocks.containers.set(container.guid, {
					...container,
					revision: 1,
					valid_currently: true,
					valid_from: new Date()
				});
			}
			return {
				affectedIndexingGuids: [
					...new Set(
						inserts.flatMap(({ guid, relation }) => [
							guid,
							...relation.flatMap(({ object, subject }) => [object, subject])
						])
					)
				],
				containers: inserts
			};
		}
}));
vi.mock('$lib/server/indexingQueue', () => ({
	enqueueIndexingEvents: async (events: unknown[]) => {
		mocks.indexed(events);
		return { failed: 0, successful: events.length };
	}
}));
import { locale } from 'svelte-i18n';
import {
	composeUserGrants,
	grantRecordsForRoleOn,
	grantSetForRole,
	type MemberRole,
	memberRoles
} from '$lib/models';
import { POST } from './+server';

locale.set('en');

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const measureGuid = '00000000-0000-4000-8000-000000000002';
const indicatorGuid = '00000000-0000-4000-8000-000000000003';
const userGuid = '00000000-0000-4000-8000-000000000004';
const newIndicatorPlaceholder = '00000000-0000-4000-8000-0000000000a1';
const newEffectPlaceholder = '00000000-0000-4000-8000-0000000000a2';

function grantsAs(role: MemberRole) {
	const set = grantSetForRole(role);
	return composeUserGrants({
		scopeSourced: true,
		governsItself: true,
		organizationSelf: set.self,
		organizationalUnitSelf: [],
		sources: [{ guid: organizationGuid, self: set.self, subordinates: set.subordinates }]
	});
}

function stored(guid: string, payload: Record<string, unknown>, role: MemberRole) {
	return {
		guid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload: { visibility: 'organization', ...payload },
		realm: 'knot-dots',
		relation: [],
		revision: 1,
		user: [],
		user_grant: grantsAs(role),
		valid_currently: true,
		valid_from: new Date()
	};
}

// The user heads the measure; the role in the organization decides whether
// they may create indicators there.
function setUp(organizationRole: MemberRole = memberRoles.enum.head) {
	mocks.containers = new Map<string, unknown>([
		[
			organizationGuid,
			stored(organizationGuid, { name: 'Org', type: 'organization' }, organizationRole)
		],
		[measureGuid, stored(measureGuid, { title: 'Measure', type: 'measure' }, 'head')],
		[
			indicatorGuid,
			stored(
				indicatorGuid,
				{ title: 'Modal split', type: 'indicator', unit: 'unit.percent' },
				organizationRole
			)
		]
	]);
}

beforeEach(() => {
	mocks.create.mockReset();
	mocks.indexed.mockReset();
	setUp();
});

function newContainer(
	payload: Record<string, unknown>,
	{ guid, relation = [] }: { guid?: string; relation?: unknown[] } = {}
) {
	return {
		...(guid ? { guid } : undefined),
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		payload,
		realm: 'knot-dots',
		relation
	};
}

function newIndicator(payload: Record<string, unknown> = {}) {
	return newContainer(
		{ title: 'Cyclists', type: 'indicator', unit: 'unit.percent', ...payload },
		{ guid: newIndicatorPlaceholder }
	);
}

function newEffect(
	payload: Record<string, unknown>,
	{ indicator = newIndicatorPlaceholder, parent = measureGuid } = {}
) {
	return newContainer(
		{ title: 'Cyclists', type: 'effect', ...payload },
		{
			guid: newEffectPlaceholder,
			relation: [
				{ object: indicator, position: 0, predicate: 'is-measured-by' },
				{ object: parent, position: 0, predicate: 'is-part-of' }
			]
		}
	);
}

function post(body: unknown) {
	return POST({
		locals: {
			features: [],
			pool: {
				connect: (fn: (connection: unknown) => unknown) => fn({}),
				transaction: (fn: (connection: unknown) => unknown) => fn({})
			},
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
		request: new Request('http://localhost/container/batch', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		})
	} as never);
}

test('containers refer to each other by placeholders replaced by new guids', async () => {
	const response = await post([newIndicator(), newEffect({ plannedValues: [[2030, 30]] })]);

	expect(response.status).toBe(201);
	const [indicator, effect] = await response.json();
	expect(indicator.payload).toMatchObject({ title: 'Cyclists', type: 'indicator' });
	expect(effect.payload).toMatchObject({ plannedValues: [[2030, 30]], type: 'effect' });
	expect([indicator.guid, effect.guid]).not.toContain(newIndicatorPlaceholder);
	expect([indicator.guid, effect.guid]).not.toContain(newEffectPlaceholder);
	expect(effect.relation).toEqual([
		{ object: indicator.guid, position: 0, predicate: 'is-measured-by', subject: effect.guid },
		{ object: measureGuid, position: 0, predicate: 'is-part-of', subject: effect.guid }
	]);
	expect(mocks.create).toHaveBeenCalledTimes(2);
	expect(mocks.indexed).toHaveBeenCalledWith(
		expect.arrayContaining([
			expect.objectContaining({ action: 'upsert', guid: effect.guid }),
			expect.objectContaining({ action: 'upsert', guid: indicator.guid }),
			expect.objectContaining({ action: 'upsert', guid: measureGuid })
		])
	);
});

test('a container may refer to an existing one', async () => {
	const response = await post([newEffect({ trendValue: 1 }, { indicator: indicatorGuid })]);

	expect(response.status).toBe(201);
	const [effect] = await response.json();
	expect(effect.relation).toContainEqual({
		object: indicatorGuid,
		position: 0,
		predicate: 'is-measured-by',
		subject: effect.guid
	});
	expect(mocks.create).toHaveBeenCalledTimes(1);
});

test('nothing is created when one of the containers may not be created', async () => {
	setUp(memberRoles.enum.observer);

	await expect(post([newIndicator(), newEffect({ trendValue: 1 })])).rejects.toMatchObject({
		status: 403
	});
	expect(mocks.create).not.toHaveBeenCalled();
	expect(mocks.indexed).not.toHaveBeenCalled();
});

test('a container cannot be part of another one of the batch', async () => {
	const measure = newContainer(
		{ title: 'Measure', type: 'measure' },
		{ guid: '00000000-0000-4000-8000-0000000000a3' }
	);

	await expect(
		post([
			measure,
			newIndicator(),
			newEffect({ trendValue: 1 }, { parent: '00000000-0000-4000-8000-0000000000a3' })
		])
	).rejects.toMatchObject({ status: 422 });
	expect(mocks.create).not.toHaveBeenCalled();
});

test.each([
	['an empty batch', []],
	[
		'too many containers',
		Array.from({ length: 21 }, () => newContainer({ title: 'Goal', type: 'goal' }))
	],
	['the same placeholder twice', [newIndicator(), newIndicator()]],
	[
		'the same relation twice',
		[
			newIndicator(),
			newEffect({ trendValue: 1 }),
			newContainer(
				{ title: 'Text', type: 'text' },
				{
					relation: [
						{
							object: newIndicatorPlaceholder,
							position: 0,
							predicate: 'is-measured-by',
							subject: newEffectPlaceholder
						}
					]
				}
			)
		]
	],
	['an organization', [newContainer({ name: 'Org', type: 'organization' })]]
])('%s is refused', async (_, body) => {
	await expect(post(body)).rejects.toMatchObject({ status: 422 });
	expect(mocks.create).not.toHaveBeenCalled();
});
