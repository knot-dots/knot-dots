import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';
import { UniqueIntegrityConstraintViolationError } from 'slonik';

const { ContainerRestoreError, restoreContainerRecursively } = vi.hoisted(() => ({
	ContainerRestoreError: class ContainerRestoreError extends Error {
		constructor(public readonly kind: 'not_found' | 'unsupported') {
			super(kind);
		}
	},
	restoreContainerRecursively: vi.fn()
}));

vi.mock('$lib/server/db', () => ({ ContainerRestoreError, restoreContainerRecursively }));

import { POST } from './+server';
import { emptyGrantRecords } from '$lib/models';

locale.set('en');

const guid = '00000000-0000-4000-8000-000000000001';
const sysadmin = {
	familyName: 'Admin',
	givenName: 'Test',
	grants: emptyGrantRecords(),
	guid: '00000000-0000-4000-8000-000000000002',
	isAuthenticated: true,
	roles: ['sysadmin'],
	settings: {}
};
const member = { ...sysadmin, roles: [] };
const anonymous = { ...member, isAuthenticated: false };
const restored = { guid, payload: { title: 'Restored', type: 'goal' }, revision: 3 };

function post(user: typeof sysadmin) {
	return POST({
		locals: {
			pool: { connect: vi.fn().mockImplementation(async (operation) => operation({})) },
			user
		},
		params: { guid },
		request: new Request(`http://localhost/container/${guid}/restore`, { method: 'POST' })
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	restoreContainerRecursively.mockReturnValue(async () => restored);
});

test('anonymous requests are rejected', async () => {
	await expect(post(anonymous)).rejects.toMatchObject({ status: 401 });
	expect(restoreContainerRecursively).not.toHaveBeenCalled();
});

test('only sysadmins may restore', async () => {
	await expect(post(member)).rejects.toMatchObject({ status: 403 });
	expect(restoreContainerRecursively).not.toHaveBeenCalled();
});

test('a sysadmin gets the restored container back', async () => {
	const response = await post(sysadmin);

	expect(response.status).toBe(200);
	expect(await response.json()).toEqual(restored);
	expect(restoreContainerRecursively).toHaveBeenCalledWith(guid);
});

test.each([
	['not_found', 404],
	['unsupported', 422]
] as const)('a restore error of kind %s answers with %i', async (kind, status) => {
	restoreContainerRecursively.mockReturnValue(async () => {
		throw new ContainerRestoreError(kind);
	});

	await expect(post(sysadmin)).rejects.toMatchObject({ status });
});

test('a slug taken in the meantime answers with 409', async () => {
	restoreContainerRecursively.mockReturnValue(async () => {
		throw new UniqueIntegrityConstraintViolationError(
			Object.assign(new Error('duplicate key'), {
				constraint: 'container_payload_organizational_unit_slug_key'
			})
		);
	});

	await expect(post(sysadmin)).rejects.toMatchObject({ status: 409 });
});
