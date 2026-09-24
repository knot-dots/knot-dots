import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const mocks = vi.hoisted(() => ({
	containers: new Map<string, Container<AnyPayload>>(),
	deniedUpdates: new Set<string>(),
	recordMcpWriteEvent: vi.fn(),
	transactionConnection: { transaction: true },
	unreadableGuids: new Set<string>(),
	updateContainerPayload: vi.fn()
}));

vi.mock('$lib/authorization', () => ({
	default: () => {
		const isDenied = (action: string, subject: Container<AnyPayload>) =>
			(action === 'read' && mocks.unreadableGuids.has(subject.guid)) ||
			(action === 'update' && mocks.deniedUpdates.has(subject.guid));
		return {
			can: (action: string, subject: Container<AnyPayload>) => !isDenied(action, subject),
			cannot: isDenied
		};
	}
}));
vi.mock('$lib/server/computeManagedBy', () => ({
	applyComputedManagedBy: async (_connection: unknown, containers: unknown[]) => containers
}));
vi.mock('$lib/server/db', () => ({
	ContainerRevisionConflictError: class ContainerRevisionConflictError extends Error {
		constructor(public readonly currentRevision: number) {
			super('conflict');
		}
	},
	getContainerByGuid: (guid: string) => async () => {
		const container = mocks.containers.get(guid);
		if (!container) {
			const { NotFoundError } = await import('slonik');
			throw new NotFoundError('Resource not found.', { sql: '', values: [] });
		}
		return container;
	},
	recordMcpWriteEvent: (event: unknown) => async (connection: unknown) =>
		mocks.recordMcpWriteEvent(event, connection),
	updateContainerPayload: (input: unknown, options: unknown) => async () =>
		mocks.updateContainerPayload(input, options)
}));
vi.mock('$lib/server/mcp/userContext', () => ({
	loadMcpUserContext: async (_connection: unknown, userId: string) => ({
		familyName: '',
		givenName: '',
		grants: emptyGrantRecords(),
		guid: userId,
		isAuthenticated: true,
		roles: [],
		settings: {}
	})
}));

import { ContainerRevisionConflictError } from '$lib/server/db';
import { updateContainerInput } from '$lib/server/mcp/contracts/update';
import { updateMcpContainer } from '$lib/server/mcp/update';

const guid = '00000000-0000-4000-8000-000000000001';
const organizationGuid = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';
const tokenId = '00000000-0000-4000-8000-000000000004';

function container(payload: unknown, revision = 2): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload,
		realm: 'test',
		relation: [],
		revision,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-09-24T00:00:00.000Z')
	});
}

function update(payloadPatch: Record<string, unknown>, expectedRevision = 2) {
	return updateMcpContainer({
		...updateContainerInput.parse({ expectedRevision, guid, payloadPatch }),
		tokenId,
		userId
	})({} as never);
}

beforeEach(() => {
	mocks.containers.clear();
	mocks.containers.set(
		guid,
		container({ description: 'Old description', title: 'Climate goal', type: 'goal' })
	);
	mocks.deniedUpdates.clear();
	mocks.unreadableGuids.clear();
	mocks.recordMcpWriteEvent.mockReset();
	mocks.updateContainerPayload.mockReset();
	mocks.updateContainerPayload.mockImplementation(async ({ payload }, { afterUpdate }) => {
		const updated = { ...mocks.containers.get(guid), payload, revision: 3 };
		await afterUpdate?.(updated, mocks.transactionConnection);
		return updated;
	});
});

test('merges the patch, writes it for the expected revision and records the write', async () => {
	const updated = await update({ description: null, title: 'Renamed goal' });

	expect(mocks.updateContainerPayload).toHaveBeenCalledExactlyOnceWith(
		{
			editorGuid: userId,
			expectedRevision: 2,
			guid,
			payload: expect.objectContaining({ title: 'Renamed goal', type: 'goal' })
		},
		{ afterUpdate: expect.any(Function) }
	);
	expect(updated.payload).not.toHaveProperty('description');
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
		{ containerGuid: guid, revision: 3, tokenId, tool: 'update_container', userId },
		mocks.transactionConnection
	);
});

test.each([
	['missing', () => mocks.containers.clear()],
	['hidden', () => mocks.unreadableGuids.add(guid)],
	[
		'not exposed through MCP',
		() => mocks.containers.set(guid, container({ title: 'Text', type: 'text' }))
	]
])('rejects a %s container', async (_, arrange) => {
	arrange();

	await expect(update({ title: 'Renamed' })).rejects.toThrow(
		'Container not found or inaccessible.'
	);
	expect(mocks.updateContainerPayload).not.toHaveBeenCalled();
});

test('rejects a stale expected revision before writing', async () => {
	await expect(update({ title: 'Renamed' }, 1)).rejects.toThrow(
		'The container changed since revision 1.'
	);
	expect(mocks.updateContainerPayload).not.toHaveBeenCalled();
});

test('reports a revision conflict detected while writing', async () => {
	mocks.updateContainerPayload.mockRejectedValue(new ContainerRevisionConflictError(3));

	await expect(update({ title: 'Renamed' })).rejects.toThrow(
		'The container changed since revision 2.'
	);
});

test.each([
	['a type change', { type: 'task' }, 'The payload type cannot be changed.'],
	['a template flag', { template: true }, 'Templates cannot be updated by this tool.'],
	['an invalid field', { title: 42 }, 'payload.title']
])('rejects %s', async (_, patch, message) => {
	await expect(update(patch)).rejects.toThrow(message);
	expect(mocks.updateContainerPayload).not.toHaveBeenCalled();
	expect(mocks.recordMcpWriteEvent).not.toHaveBeenCalled();
});

test('rejects updating a template', async () => {
	mocks.containers.set(guid, container({ template: true, title: 'Template', type: 'goal' }));

	await expect(update({ title: 'Renamed' })).rejects.toThrow(
		'Templates cannot be updated by this tool.'
	);
});

test('rejects users who may not update the container', async () => {
	mocks.deniedUpdates.add(guid);

	await expect(update({ title: 'Renamed' })).rejects.toThrow(
		'You are not allowed to update this container.'
	);
	expect(mocks.updateContainerPayload).not.toHaveBeenCalled();
});

test('rejects an empty patch in the MCP contract', () => {
	expect(
		updateContainerInput.safeParse({ expectedRevision: 2, guid, payloadPatch: {} }).success
	).toBe(false);
});
