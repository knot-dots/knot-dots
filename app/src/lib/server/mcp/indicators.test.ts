import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const mocks = vi.hoisted(() => ({
	containers: new Map<string, Container<AnyPayload>>(),
	createAuthorizedContainer: vi.fn(),
	recordMcpWriteEvent: vi.fn(),
	transactionConnection: { transaction: true },
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
vi.mock('$lib/server/containerCreation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/containerCreation')>()),
	createAuthorizedContainer: mocks.createAuthorizedContainer
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

import { ContainerCreationError } from '$lib/server/containerCreation';
import { attachIndicatorInput } from '$lib/server/mcp/contracts/indicators';
import { attachMcpIndicator } from '$lib/server/mcp/indicators';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const otherOrganizationGuid = '00000000-0000-4000-8000-000000000002';
const unitGuid = '00000000-0000-4000-8000-000000000003';
const targetGuid = '00000000-0000-4000-8000-000000000004';
const indicatorGuid = '00000000-0000-4000-8000-000000000005';
const effectGuid = '00000000-0000-4000-8000-000000000006';
const createdGuid = '00000000-0000-4000-8000-000000000007';
const userId = '00000000-0000-4000-8000-000000000008';
const tokenId = '00000000-0000-4000-8000-000000000009';

function container(
	guid: string,
	payload: Record<string, unknown>,
	options: {
		organization?: string;
		relation?: Array<{ object: string; predicate: string; subject: string }>;
	} = {}
): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: unitGuid,
		organization: options.organization ?? organizationGuid,
		organizational_unit: unitGuid,
		payload,
		realm: 'test',
		relation: (options.relation ?? []).map((r) => ({ position: 0, ...r })),
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-10-05T00:00:00.000Z')
	});
}

const indicator = (organization = organizationGuid) =>
	container(
		indicatorGuid,
		{ title: 'CO2 emissions', type: 'indicator_template', unit: 't', visibility: 'public' },
		{ organization }
	);

function attach(input: Record<string, unknown> = {}) {
	return attachMcpIndicator({
		...attachIndicatorInput.parse({ indicatorGuid, targetGuid, ...input }),
		tokenId,
		userId
	})({} as never);
}

function createdData() {
	return mocks.createAuthorizedContainer.mock.calls[0][0].data;
}

beforeEach(() => {
	mocks.containers.clear();
	mocks.containers.set(targetGuid, container(targetGuid, { title: 'Bike lanes', type: 'measure' }));
	mocks.containers.set(indicatorGuid, indicator());
	mocks.unreadableGuids.clear();
	mocks.recordMcpWriteEvent.mockReset();
	mocks.createAuthorizedContainer.mockReset();
	mocks.createAuthorizedContainer.mockImplementation(({ afterCreate, data }) => async () => {
		const created = { ...data, guid: createdGuid, revision: 2 };
		await afterCreate?.(created, mocks.transactionConnection);
		return created;
	});
});

test.each(['measure', 'simple_measure'])(
	'attaches an indicator to a %s through an effect and records the write',
	async (type) => {
		mocks.containers.set(targetGuid, container(targetGuid, { title: 'Bike lanes', type }));

		await expect(attach()).resolves.toEqual({
			attachment: { guid: createdGuid, indicatorGuid, targetGuid, type: 'effect' },
			changed: true
		});
		expect(createdData()).toMatchObject({
			managed_by: [unitGuid],
			organization: organizationGuid,
			organizational_unit: unitGuid,
			payload: { iooiType: 'iooi.output', title: 'CO2 emissions', type: 'effect' },
			relation: [
				{ object: indicatorGuid, position: 0, predicate: 'is-measured-by' },
				{ object: targetGuid, position: 0, predicate: 'is-part-of' }
			]
		});
		expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ containerGuid: createdGuid, tool: 'attach_indicator' }),
			mocks.transactionConnection
		);
	}
);

test('attaches an indicator to a goal through an objective', async () => {
	mocks.containers.set(targetGuid, container(targetGuid, { title: 'Clean air', type: 'goal' }));

	await expect(attach({ iooiType: 'iooi.outcome' })).resolves.toMatchObject({
		attachment: { type: 'objective' },
		changed: true
	});
	expect(createdData()).toMatchObject({
		payload: { iooiType: 'iooi.outcome', title: 'CO2 emissions', type: 'objective' },
		relation: [
			{ object: indicatorGuid, predicate: 'is-objective-for' },
			{ object: targetGuid, predicate: 'is-part-of' }
		]
	});
});

test('accepts a visible indicator of another organization', async () => {
	mocks.containers.set(indicatorGuid, indicator(otherOrganizationGuid));

	await expect(attach()).resolves.toMatchObject({ changed: true });
	expect(createdData()).toMatchObject({ organization: organizationGuid });
});

test('does not attach an indicator twice', async () => {
	mocks.containers.set(
		targetGuid,
		container(
			targetGuid,
			{ title: 'Bike lanes', type: 'measure' },
			{ relation: [{ object: targetGuid, predicate: 'is-part-of', subject: effectGuid }] }
		)
	);
	mocks.containers.set(
		effectGuid,
		container(
			effectGuid,
			{ title: 'CO2 emissions', type: 'effect' },
			{
				relation: [
					{ object: indicatorGuid, predicate: 'is-measured-by', subject: effectGuid },
					{ object: targetGuid, predicate: 'is-part-of', subject: effectGuid }
				]
			}
		)
	);

	await expect(attach()).resolves.toEqual({
		attachment: { guid: effectGuid, indicatorGuid, targetGuid, type: 'effect' },
		changed: false
	});
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
	expect(mocks.recordMcpWriteEvent).not.toHaveBeenCalled();
});

test.each([
	['a missing target', () => mocks.containers.delete(targetGuid)],
	['a hidden target', () => mocks.unreadableGuids.add(targetGuid)],
	[
		'a program as target',
		() =>
			mocks.containers.set(targetGuid, container(targetGuid, { title: 'Plan', type: 'program' }))
	]
])('rejects %s', async (_, arrange) => {
	arrange();

	await expect(attach()).rejects.toThrow(
		'Target not found or inaccessible; it must be a measure, simple measure or goal.'
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test.each([
	['a missing indicator', () => mocks.containers.delete(indicatorGuid)],
	['a hidden indicator', () => mocks.unreadableGuids.add(indicatorGuid)],
	[
		'a goal as indicator',
		() =>
			mocks.containers.set(indicatorGuid, container(indicatorGuid, { title: 'Goal', type: 'goal' }))
	]
])('rejects %s', async (_, arrange) => {
	arrange();

	await expect(attach()).rejects.toThrow(
		'Indicator not found or inaccessible; it must be an indicator template or a binary indicator.'
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('reports a missing permission to create below the target', async () => {
	mocks.createAuthorizedContainer.mockImplementation(() => async () => {
		throw new ContainerCreationError('forbidden');
	});

	await expect(attach()).rejects.toThrow('You are not allowed to create content in this context.');
});

test.each([
	[
		'target',
		() =>
			mocks.containers.set(
				targetGuid,
				container(targetGuid, { template: true, title: 'Template', type: 'measure' })
			),
		'The target is marked as a template (template: true); indicators cannot be attached to it.'
	],
	[
		'indicator',
		() =>
			mocks.containers.set(
				indicatorGuid,
				container(indicatorGuid, {
					template: true,
					title: 'CO2',
					type: 'indicator_template',
					unit: 't'
				})
			),
		'The indicator is marked as a template (template: true) and cannot be attached.'
	]
])('rejects a %s marked as a template', async (_, arrange, message) => {
	arrange();

	await expect(attach()).rejects.toThrow(message);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});
