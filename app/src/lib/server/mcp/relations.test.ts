import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const mocks = vi.hoisted(() => ({
	containers: new Map<string, Container<AnyPayload>>(),
	unreadableGuids: new Set<string>()
}));

vi.mock('$lib/authorization', () => ({
	default: () => {
		const isDenied = (action: string, subject: Container<AnyPayload>) =>
			action === 'read' && mocks.unreadableGuids.has(subject.guid);
		return {
			can: (action: string, subject: Container<AnyPayload>) => !isDenied(action, subject),
			cannot: isDenied
		};
	}
}));
vi.mock('$lib/server/db', () => ({
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
			guid.flatMap((value) => mocks.containers.get(value) ?? [])
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

import { listContainerRelationsInput } from '$lib/server/mcp/contracts/relations';
import { listMcpContainerRelations } from '$lib/server/mcp/relations';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const goalGuid = '00000000-0000-4000-8000-000000000002';
const measureGuid = '00000000-0000-4000-8000-000000000003';
const programGuid = '00000000-0000-4000-8000-000000000004';
const hiddenGuid = '00000000-0000-4000-8000-000000000005';
const userId = '00000000-0000-4000-8000-000000000006';

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
	mocks.containers.clear();
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
