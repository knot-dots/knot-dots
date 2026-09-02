import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const createOrUpdateTaskPriority = vi.hoisted(() => vi.fn());
const getManyContainers = vi.hoisted(() => vi.fn());

locale.set('en');

vi.mock('$lib/server/db', () => ({ createOrUpdateTaskPriority, getManyContainers }));

import { POST } from './+server';

const team = '00000000-0000-4000-8000-000000000001';
const otherTeam = '00000000-0000-4000-8000-000000000002';
const editableTask = '00000000-0000-4000-8000-000000000003';
const foreignTask = '00000000-0000-4000-8000-000000000004';

function task(guid: string, managedBy: string) {
	return {
		guid,
		managed_by: [managedBy],
		organization: otherTeam,
		organizational_unit: null,
		payload: { title: 'Task', type: 'task', visibility: 'members' },
		relation: [],
		user: []
	};
}

const user = {
	adminOf: [],
	collaboratorOf: [team],
	familyName: 'User',
	givenName: 'Test',
	guid: '00000000-0000-4000-8000-000000000005',
	headOf: [],
	isAuthenticated: true,
	memberOf: [team],
	roles: [],
	settings: {}
};

function post(priorities: unknown) {
	const request = new Request('http://localhost/task-priority', {
		method: 'POST',
		body: JSON.stringify(priorities),
		headers: { 'Content-Type': 'application/json' }
	});

	return POST({
		locals: {
			pool: { connect: vi.fn().mockImplementation(async (value) => value) },
			user
		},
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	getManyContainers.mockReturnValue([task(editableTask, team), task(foreignTask, otherTeam)]);
});

test('prioritizes only tasks the user may update', async () => {
	const response = await post([
		{ priority: 0, task: editableTask },
		{ priority: 1, task: foreignTask }
	]);

	expect(response.status).toBe(204);
	expect(createOrUpdateTaskPriority).toHaveBeenCalledWith([{ priority: 0, task: editableTask }]);
});

test('writes nothing when the user may update none of the tasks', async () => {
	const response = await post([{ priority: 0, task: foreignTask }]);

	expect(response.status).toBe(204);
	expect(createOrUpdateTaskPriority).not.toHaveBeenCalled();
});
