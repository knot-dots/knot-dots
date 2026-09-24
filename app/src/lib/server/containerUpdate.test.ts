import { beforeEach, expect, test, vi } from 'vitest';
import {
	anyContainer,
	emptyGrantRecords,
	modifiedContainer,
	type AnyPayload,
	type Container
} from '$lib/models';

const mocks = vi.hoisted(() => ({ denied: new Set<string>() }));

function isDenied(action: string, _subject: unknown, field?: string) {
	return mocks.denied.has(field ? `${action}:${field}` : action);
}

vi.mock('$lib/authorization', () => ({
	default: () => ({
		can: (action: string, subject: unknown, field?: string) => !isDenied(action, subject, field),
		cannot: isDenied
	})
}));

import { authorizeContainerUpdate, ContainerUpdateError } from '$lib/server/containerUpdate';

const guid = '00000000-0000-4000-8000-000000000001';
const organization = '00000000-0000-4000-8000-000000000002';
const scope = '00000000-0000-4000-8000-000000000003';
const user = {
	familyName: '',
	givenName: '',
	grants: emptyGrantRecords(),
	guid: '00000000-0000-4000-8000-000000000004',
	isAuthenticated: true,
	roles: [],
	settings: {}
};

function current(payload: unknown, relation: unknown[] = []): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: organization,
		organization,
		organizational_unit: null,
		payload,
		realm: 'test',
		relation,
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-09-24T00:00:00.000Z')
	});
}

function next(container: Container<AnyPayload>, payload: Record<string, unknown>) {
	return modifiedContainer.parse({ ...container, payload: { ...container.payload, ...payload } });
}

function kindOf(run: () => unknown) {
	try {
		run();
	} catch (error) {
		if (error instanceof ContainerUpdateError) return error.kind;
		throw error;
	}
	return null;
}

beforeEach(() => {
	mocks.denied.clear();
});

test('returns the submitted payload for a permitted change', () => {
	const goal = current({ title: 'Goal', type: 'goal' });

	expect(
		authorizeContainerUpdate({ current: goal, next: next(goal, { title: 'Renamed' }), user })
	).toMatchObject({ title: 'Renamed', type: 'goal' });
});

test('rejects a change that names another container', () => {
	const goal = current({ title: 'Goal', type: 'goal' });
	const other = modifiedContainer.parse({
		...goal,
		guid: '00000000-0000-4000-8000-000000000005'
	});

	expect(kindOf(() => authorizeContainerUpdate({ current: goal, next: other, user }))).toBe(
		'invalid'
	);
});

test('rejects users who may not update the container', () => {
	mocks.denied.add('update');
	const goal = current({ title: 'Goal', type: 'goal' });

	expect(
		kindOf(() => authorizeContainerUpdate({ current: goal, next: next(goal, {}), user }))
	).toBe('forbidden');
});

test('rejects a change of the payload type', () => {
	const goal = current({ title: 'Goal', type: 'goal' });
	const task = modifiedContainer.parse({ ...goal, payload: { title: 'Goal', type: 'task' } });

	expect(kindOf(() => authorizeContainerUpdate({ current: goal, next: task, user }))).toBe(
		'invalid'
	);
});

test('keeps scoped templates templates', () => {
	const template = current({ template: true, title: 'Template', type: 'goal' }, [
		{ object: scope, position: 0, predicate: 'is-available-in', subject: guid }
	]);

	expect(
		kindOf(() =>
			authorizeContainerUpdate({
				current: template,
				next: next(template, { template: false }),
				user
			})
		)
	).toBe('invalid');
	expect(
		kindOf(() =>
			authorizeContainerUpdate({ current: template, next: next(template, { title: 'New' }), user })
		)
	).toBeNull();
});

test.each([
	[
		'payload.editorialState',
		{ editorialState: 'editorial_state.draft', title: 'Goal', type: 'goal' },
		{ editorialState: 'editorial_state.approved' }
	],
	[
		'indicatorCategory',
		{ indicatorCategory: [], title: 'Indicator', type: 'indicator_template', unit: 't' },
		{ indicatorCategory: ['indicator_category.kpi'] }
	],
	[
		'payload.customDomain',
		{ name: 'Anytown', type: 'organization' },
		{ customDomain: 'anytown.example' }
	]
])('requires field permission to change %s', (field, payload, change) => {
	const container = current(payload);
	const run = () =>
		authorizeContainerUpdate({ current: container, next: next(container, change), user });

	expect(kindOf(run)).toBeNull();
	mocks.denied.add(`update:${field}`);
	expect(kindOf(run)).toBe('forbidden');
});

test('lowers the AI contribution of an edited AI-generated container', () => {
	const goal = current({ aiContribution: 1, title: 'Generated', type: 'goal' });

	expect(
		authorizeContainerUpdate({ current: goal, next: next(goal, { title: 'Edited' }), user })
	).toMatchObject({ aiContribution: 0.5 });
	expect(authorizeContainerUpdate({ current: goal, next: next(goal, {}), user })).toMatchObject({
		aiContribution: 1
	});
});
