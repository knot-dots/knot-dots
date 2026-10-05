import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const mocks = vi.hoisted(() => ({
	changeManyContainerRelations: vi.fn(),
	containers: new Map<string, Container<AnyPayload>>(),
	deniedUpdates: new Set<string>(),
	recordMcpWriteEvent: vi.fn(),
	transactionConnection: { transaction: true },
	unreadableGuids: new Set<string>()
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
vi.mock('$lib/server/db', () => ({
	changeManyContainerRelations:
		(
			changes: unknown,
			{ afterChange }: { afterChange?: (connection: unknown) => Promise<void> } = {}
		) =>
		async () => {
			mocks.changeManyContainerRelations(changes);
			await afterChange?.(mocks.transactionConnection);
		},
	getContainerByGuid: (guid: string) => async () => {
		const container = mocks.containers.get(guid);
		if (!container) {
			const { NotFoundError } = await import('slonik');
			throw new NotFoundError('Resource not found.', { sql: '', values: [] });
		}
		return container;
	},
	getManyContainers:
		(_organizations: string[], { guid }: { guid: string[] }) =>
		async () =>
			guid.flatMap((value) => mocks.containers.get(value) ?? []),
	recordMcpWriteEvent: (event: unknown) => async (connection: unknown) =>
		mocks.recordMcpWriteEvent(event, connection)
}));
vi.mock('$lib/server/features', () => ({ getFeatures: () => [] }));
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

import {
	containerRelationChangeInput,
	listContainerRelationsInput
} from '$lib/server/mcp/contracts/relations';
import {
	addMcpContainerRelation,
	listMcpContainerRelations,
	removeMcpContainerRelation
} from '$lib/server/mcp/relations';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const goalGuid = '00000000-0000-4000-8000-000000000002';
const measureGuid = '00000000-0000-4000-8000-000000000003';
const programGuid = '00000000-0000-4000-8000-000000000004';
const hiddenGuid = '00000000-0000-4000-8000-000000000005';
const userId = '00000000-0000-4000-8000-000000000006';
const tokenId = '00000000-0000-4000-8000-000000000007';

function container(
	guid: string,
	payload: Record<string, unknown>,
	relation: Array<{ object: string; position?: number; predicate: string; subject: string }> = []
): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload,
		realm: 'test',
		relation: relation.map((r) => ({ position: 0, ...r })),
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-09-28T00:00:00.000Z')
	});
}

function list(input: Record<string, unknown> = {}) {
	return listMcpContainerRelations({
		...listContainerRelationsInput.parse({ guid: goalGuid, ...input }),
		userId
	})({} as never);
}

beforeEach(() => {
	mocks.changeManyContainerRelations.mockReset();
	mocks.containers.clear();
	mocks.deniedUpdates.clear();
	mocks.recordMcpWriteEvent.mockReset();
	mocks.unreadableGuids.clear();
	mocks.containers.set(
		goalGuid,
		container(goalGuid, { title: 'Climate goal', type: 'goal' }, [
			{ object: measureGuid, predicate: 'contributes-to', subject: goalGuid },
			{ object: goalGuid, predicate: 'is-prerequisite-for', subject: measureGuid },
			{ object: programGuid, position: 3, predicate: 'is-part-of-program', subject: goalGuid },
			{ object: hiddenGuid, predicate: 'is-consistent-with', subject: goalGuid }
		])
	);
	mocks.containers.set(
		measureGuid,
		container(measureGuid, { title: 'Bike lanes', type: 'measure' })
	);
	mocks.containers.set(programGuid, container(programGuid, { title: 'Plan', type: 'program' }));
	mocks.containers.set(hiddenGuid, container(hiddenGuid, { title: 'Secret', type: 'goal' }));
	mocks.unreadableGuids.add(hiddenGuid);
});

test('lists relations in both directions with the other container, leaving out hidden ones', async () => {
	await expect(list()).resolves.toEqual({
		nextOffset: null,
		relations: [
			{
				container: expect.objectContaining({ guid: measureGuid, label: 'Bike lanes' }),
				direction: 'outgoing',
				position: 0,
				predicate: 'contributes-to'
			},
			{
				container: expect.objectContaining({ guid: measureGuid, type: 'measure' }),
				direction: 'incoming',
				position: 0,
				predicate: 'is-prerequisite-for'
			},
			{
				container: expect.objectContaining({ guid: programGuid, label: 'Plan' }),
				direction: 'outgoing',
				position: 3,
				predicate: 'is-part-of-program'
			}
		]
	});
});

test('filters by predicate', async () => {
	await expect(list({ predicates: ['is-part-of-program'] })).resolves.toMatchObject({
		relations: [{ container: { guid: programGuid }, predicate: 'is-part-of-program' }]
	});
});

test('pages through visible relations', async () => {
	await expect(list({ limit: 2 })).resolves.toMatchObject({
		nextOffset: 2,
		relations: [{ predicate: 'contributes-to' }, { predicate: 'is-prerequisite-for' }]
	});
	await expect(list({ limit: 2, offset: 2 })).resolves.toMatchObject({
		nextOffset: null,
		relations: [{ predicate: 'is-part-of-program' }]
	});
});

test.each([
	['missing', () => mocks.containers.delete(goalGuid)],
	['hidden', () => mocks.unreadableGuids.add(goalGuid)]
])('rejects a %s container', async (_, arrange) => {
	arrange();

	await expect(list()).rejects.toThrow('Container not found or inaccessible.');
});

function change(
	action: 'add' | 'remove',
	relation: { objectGuid?: string; predicate?: string; subjectGuid?: string } = {}
) {
	const input = containerRelationChangeInput.parse({
		objectGuid: measureGuid,
		predicate: 'contributes-to',
		subjectGuid: goalGuid,
		...relation
	});
	const apply = action === 'add' ? addMcpContainerRelation : removeMcpContainerRelation;
	return apply({ ...input, tokenId, userId })({} as never);
}

function withRelations(
	guid: string,
	relation: Array<{ object: string; predicate: string; subject: string }>
) {
	const current = mocks.containers.get(guid)!;
	mocks.containers.set(guid, container(guid, current.payload, relation));
}

test('adds a relation and records it within the write', async () => {
	withRelations(goalGuid, []);

	await expect(change('add')).resolves.toEqual({
		changed: true,
		relation: { objectGuid: measureGuid, predicate: 'contributes-to', subjectGuid: goalGuid }
	});
	expect(mocks.changeManyContainerRelations).toHaveBeenCalledExactlyOnceWith({
		removed: [],
		upserted: [
			{
				deleted: false,
				object: measureGuid,
				position: 0,
				predicate: 'contributes-to',
				subject: goalGuid
			}
		]
	});
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
		{
			containerGuid: goalGuid,
			relation: { predicate: 'contributes-to', relatedContainerGuid: measureGuid },
			revision: null,
			tokenId,
			tool: 'add_container_relation',
			userId
		},
		mocks.transactionConnection
	);
});

test('authorizes a change through the object if only the object may be updated', async () => {
	withRelations(goalGuid, []);
	mocks.deniedUpdates.add(goalGuid);

	await expect(change('add')).resolves.toMatchObject({ changed: true });
});

test('rejects a change if neither container may be updated', async () => {
	withRelations(goalGuid, []);
	mocks.deniedUpdates.add(goalGuid);
	mocks.deniedUpdates.add(measureGuid);

	await expect(change('add')).rejects.toThrow(
		'You are not allowed to change the relations of these containers.'
	);
	expect(mocks.changeManyContainerRelations).not.toHaveBeenCalled();
	expect(mocks.recordMcpWriteEvent).not.toHaveBeenCalled();
});

test.each([
	['a self relation', { objectGuid: goalGuid }, 'A container cannot be related to itself.'],
	[
		'a missing subject',
		{ subjectGuid: '00000000-0000-4000-8000-000000000009' },
		'Subject container not found'
	],
	['a hidden subject', { subjectGuid: hiddenGuid }, 'Subject container not found'],
	['a hidden object', { objectGuid: hiddenGuid }, 'Object container not found']
])('rejects %s', async (_, relation, message) => {
	await expect(change('add', relation)).rejects.toThrow(message);
	expect(mocks.changeManyContainerRelations).not.toHaveBeenCalled();
});

test('rejects containers that are not exposed through MCP', async () => {
	mocks.containers.set(measureGuid, container(measureGuid, { title: 'HTML', type: 'html' }));

	await expect(change('add')).rejects.toThrow('Object container not found or inaccessible.');
});

test('rejects templates', async () => {
	mocks.containers.set(
		measureGuid,
		container(measureGuid, { template: true, title: 'Template', type: 'measure' })
	);

	await expect(change('add')).rejects.toThrow('Templates cannot be related by this tool.');
});

test('rejects containers of different organizations', async () => {
	mocks.containers.set(measureGuid, {
		...mocks.containers.get(measureGuid)!,
		organization: '00000000-0000-4000-8000-000000000008'
	});

	await expect(change('add')).rejects.toThrow(
		'Both containers must belong to the same organization.'
	);
});

test('adding an existing relation changes nothing', async () => {
	await expect(change('add')).resolves.toMatchObject({ changed: false });
	expect(mocks.changeManyContainerRelations).not.toHaveBeenCalled();
	expect(mocks.recordMcpWriteEvent).not.toHaveBeenCalled();
});

test('removes an existing relation and records it', async () => {
	await expect(change('remove')).resolves.toMatchObject({ changed: true });
	expect(mocks.changeManyContainerRelations).toHaveBeenCalledExactlyOnceWith({
		removed: [
			{
				deleted: true,
				object: measureGuid,
				position: 0,
				predicate: 'contributes-to',
				subject: goalGuid
			}
		],
		upserted: []
	});
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ containerGuid: goalGuid, tool: 'remove_container_relation' }),
		mocks.transactionConnection
	);
});

test('removing a missing relation changes nothing', async () => {
	await expect(change('remove', { predicate: 'is-superordinate-of' })).resolves.toEqual({
		changed: false,
		relation: { objectGuid: measureGuid, predicate: 'is-superordinate-of', subjectGuid: goalGuid }
	});
	expect(mocks.changeManyContainerRelations).not.toHaveBeenCalled();
});

test('directed relations are not matched in the other direction', async () => {
	withRelations(goalGuid, [
		{ object: goalGuid, predicate: 'contributes-to', subject: measureGuid }
	]);

	await expect(change('add')).resolves.toMatchObject({ changed: true });
});

test.each(['is-consistent-with', 'is-equivalent-to', 'is-inconsistent-with'])(
	'treats %s as symmetric',
	async (predicate) => {
		withRelations(goalGuid, [{ object: goalGuid, predicate, subject: measureGuid }]);
		const stored = { objectGuid: goalGuid, predicate, subjectGuid: measureGuid };

		await expect(change('add', { predicate })).resolves.toEqual({
			changed: false,
			relation: stored
		});
		await expect(change('remove', { predicate })).resolves.toEqual({
			changed: true,
			relation: stored
		});
		expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				containerGuid: measureGuid,
				relation: { predicate, relatedContainerGuid: goalGuid }
			}),
			mocks.transactionConnection
		);
	}
);

test('rejects predicates outside the allowlist in the MCP contract', () => {
	for (const predicate of ['is-part-of', 'is-part-of-program', 'is-adopted-by', 'is-copy-of']) {
		expect(
			containerRelationChangeInput.safeParse({
				objectGuid: measureGuid,
				predicate,
				subjectGuid: goalGuid
			}).success
		).toBe(false);
	}
});
