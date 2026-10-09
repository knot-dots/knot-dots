import { beforeEach, expect, test, vi } from 'vitest';
import { anyContainer, emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const mocks = vi.hoisted(() => ({
	actualData: [] as Container<AnyPayload>[],
	containers: new Map<string, Container<AnyPayload>>(),
	createAuthorizedContainer: vi.fn(),
	deniedUpdates: new Set<string>(),
	recordMcpWriteEvent: vi.fn(),
	transactionConnection: { transaction: true },
	unreadableGuids: new Set<string>(),
	updateContainer: vi.fn()
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
vi.mock('$lib/server/containerCreation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/containerCreation')>()),
	createAuthorizedContainer: mocks.createAuthorizedContainer
}));
vi.mock('$lib/server/db', () => ({
	ContainerRevisionConflictError: class ContainerRevisionConflictError extends Error {},
	getContainerByGuid: (guid: string) => async () => {
		const container = mocks.containers.get(guid);
		if (!container) {
			const { NotFoundError } = await import('slonik');
			throw new NotFoundError('Resource not found.', { sql: '', values: [] });
		}
		return container;
	},
	getManyContainers:
		(
			organizations: string[],
			filters: { indicators: string[]; organizationalUnits: string[] | null }
		) =>
		async () =>
			mocks.actualData.filter(
				(c) =>
					organizations.includes(c.organization) &&
					'indicator' in c.payload &&
					filters.indicators.includes(c.payload.indicator) &&
					(filters.organizationalUnits === null
						? c.organizational_unit === null
						: filters.organizationalUnits.includes(c.organizational_unit ?? ''))
			),
	recordMcpWriteEvent: (event: unknown) => async (connection: unknown) =>
		mocks.recordMcpWriteEvent(event, connection),
	updateContainer: (container: unknown, options: unknown) => async () =>
		mocks.updateContainer(container, options)
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

import { ContainerRevisionConflictError } from '$lib/server/db';
import { setActualDataInput } from '$lib/server/mcp/contracts/actualData';
import { setMcpActualData } from '$lib/server/mcp/actualData';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const otherOrganizationGuid = '00000000-0000-4000-8000-000000000002';
const unitGuid = '00000000-0000-4000-8000-000000000003';
const indicatorGuid = '00000000-0000-4000-8000-000000000004';
const actualDataGuid = '00000000-0000-4000-8000-000000000005';
const createdGuid = '00000000-0000-4000-8000-000000000006';
const userId = '00000000-0000-4000-8000-000000000007';
const tokenId = '00000000-0000-4000-8000-000000000008';

function container(
	guid: string,
	payload: Record<string, unknown>,
	{
		organization = organizationGuid,
		organizationalUnit = null
	}: { organization?: string; organizationalUnit?: string | null } = {}
): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: organizationalUnit ?? organization,
		organization,
		organizational_unit: organizationalUnit,
		payload,
		realm: 'test',
		relation: [],
		revision: 3,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-10-05T00:00:00.000Z')
	});
}

const indicatorTemplate = (organization = organizationGuid) =>
	container(
		indicatorGuid,
		{ title: 'CO2 emissions', type: 'indicator_template', unit: 't', visibility: 'public' },
		{ organization }
	);

function setActualData(input: Record<string, unknown>) {
	return setMcpActualData({
		...setActualDataInput.parse({ indicatorGuid, organizationGuid, ...input }),
		tokenId,
		userId
	})({} as never);
}

function createdData() {
	return mocks.createAuthorizedContainer.mock.calls[0][0].data;
}

beforeEach(() => {
	mocks.actualData = [];
	mocks.containers.clear();
	mocks.containers.set(
		organizationGuid,
		container(organizationGuid, { name: 'Lemgo', type: 'organization' })
	);
	mocks.containers.set(
		unitGuid,
		container(
			unitGuid,
			{ name: 'Climate office', type: 'organizational_unit' },
			{ organizationalUnit: null }
		)
	);
	mocks.containers.set(indicatorGuid, indicatorTemplate());
	mocks.deniedUpdates.clear();
	mocks.unreadableGuids.clear();
	mocks.recordMcpWriteEvent.mockReset();
	mocks.createAuthorizedContainer.mockReset();
	mocks.createAuthorizedContainer.mockImplementation(({ afterCreate, data }) => async () => {
		const created = { ...data, guid: createdGuid, revision: 1 };
		await afterCreate?.(created, mocks.transactionConnection);
		return created;
	});
	mocks.updateContainer.mockReset();
	mocks.updateContainer.mockImplementation(async (next, { afterUpdate }) => {
		const updated = { ...next, revision: 4 };
		await afterUpdate?.(updated, mocks.transactionConnection);
		return updated;
	});
});

test('records the first actual values of an indicator for an organization', async () => {
	await expect(
		setActualData({
			values: [
				{ value: 412, year: 2024 },
				{ value: 430, year: 2023 }
			]
		})
	).resolves.toEqual({
		actualData: {
			booleanValue: false,
			guid: createdGuid,
			indicatorGuid,
			organizationGuid,
			organizationalUnitGuid: null,
			source: null,
			values: [
				{ value: 430, year: 2023 },
				{ value: 412, year: 2024 }
			]
		},
		created: true
	});
	expect(createdData()).toMatchObject({
		organization: organizationGuid,
		organizational_unit: null,
		payload: {
			indicator: indicatorGuid,
			title: 'CO2 emissions',
			type: 'actual_data',
			values: [
				[2023, 430],
				[2024, 412]
			]
		}
	});
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ containerGuid: createdGuid, tool: 'set_actual_data' }),
		mocks.transactionConnection
	);
});

test('records actual values for an organizational unit apart from the organization', async () => {
	mocks.actualData = [
		container(actualDataGuid, {
			indicator: indicatorGuid,
			title: 'CO2 emissions',
			type: 'actual_data',
			values: [[2024, 1]]
		})
	];

	await setActualData({ organizationalUnitGuid: unitGuid, values: [{ value: 2, year: 2024 }] });

	expect(createdData()).toMatchObject({ organizational_unit: unitGuid });
	expect(mocks.updateContainer).not.toHaveBeenCalled();
});

test('merges the given years into the stored values', async () => {
	mocks.actualData = [
		container(actualDataGuid, {
			indicator: indicatorGuid,
			source: 'Census',
			title: 'CO2 emissions',
			type: 'actual_data',
			values: [
				[2022, 1],
				[2023, 5]
			]
		})
	];

	await expect(
		setActualData({
			values: [
				{ value: 7, year: 2024 },
				{ value: 6, year: 2023 }
			]
		})
	).resolves.toMatchObject({
		actualData: {
			guid: actualDataGuid,
			source: 'Census',
			values: [
				{ value: 1, year: 2022 },
				{ value: 6, year: 2023 },
				{ value: 7, year: 2024 }
			]
		},
		created: false
	});
	expect(mocks.updateContainer).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({
			guid: actualDataGuid,
			user: [{ predicate: 'is-creator-of', subject: userId }]
		}),
		{ afterUpdate: expect.any(Function), expectedRevision: 3 }
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
	expect(mocks.recordMcpWriteEvent).toHaveBeenCalledWith(
		expect.objectContaining({ containerGuid: actualDataGuid, tool: 'set_actual_data' }),
		mocks.transactionConnection
	);
});

test('records whether a binary indicator is fulfilled', async () => {
	mocks.containers.set(
		indicatorGuid,
		container(indicatorGuid, { title: 'Climate plan adopted', type: 'binary_indicator' })
	);

	await setActualData({ booleanValue: true });

	expect(createdData()).toMatchObject({
		payload: { booleanValue: true, indicator: indicatorGuid, values: [] }
	});
});

test.each([
	[
		'values for a binary indicator',
		() =>
			mocks.containers.set(
				indicatorGuid,
				container(indicatorGuid, { title: 'Plan adopted', type: 'binary_indicator' })
			),
		{ values: [{ value: 1, year: 2024 }] },
		'A binary indicator has no values by year; pass booleanValue.'
	],
	[
		'booleanValue for an indicator template',
		() => undefined,
		{ booleanValue: true },
		'booleanValue is only for binary indicators; pass values by year.'
	]
])('rejects %s', async (_, arrange, input, message) => {
	arrange();

	await expect(setActualData(input)).rejects.toThrow(message);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});

test('accepts a visible indicator of another organization', async () => {
	mocks.containers.set(indicatorGuid, indicatorTemplate(otherOrganizationGuid));

	await expect(setActualData({ values: [{ value: 1, year: 2024 }] })).resolves.toMatchObject({
		created: true
	});
	expect(createdData()).toMatchObject({ organization: organizationGuid });
});

test.each([
	['a hidden indicator', () => mocks.unreadableGuids.add(indicatorGuid)],
	[
		'a goal as indicator',
		() =>
			mocks.containers.set(indicatorGuid, container(indicatorGuid, { title: 'Goal', type: 'goal' }))
	]
])('rejects %s', async (_, arrange) => {
	arrange();

	await expect(setActualData({ values: [] })).rejects.toThrow(
		'Indicator not found or inaccessible'
	);
});

test('rejects an organizational unit of another organization', async () => {
	mocks.containers.set(
		unitGuid,
		container(
			unitGuid,
			{ name: 'Elsewhere', type: 'organizational_unit' },
			{ organization: otherOrganizationGuid }
		)
	);

	await expect(setActualData({ organizationalUnitGuid: unitGuid })).rejects.toThrow(
		'Organization or organizational unit not found or inaccessible.'
	);
});

test('reports missing permission and concurrent changes of stored values', async () => {
	mocks.actualData = [
		container(actualDataGuid, {
			indicator: indicatorGuid,
			title: 'CO2 emissions',
			type: 'actual_data'
		})
	];
	mocks.deniedUpdates.add(actualDataGuid);

	await expect(setActualData({ values: [{ value: 1, year: 2024 }] })).rejects.toThrow(
		'You are not allowed to change the actual values of this indicator here.'
	);

	mocks.deniedUpdates.clear();
	mocks.updateContainer.mockRejectedValue(new ContainerRevisionConflictError());

	await expect(setActualData({ values: [{ value: 1, year: 2024 }] })).rejects.toThrow(
		'The actual values were changed at the same time; call set_actual_data again.'
	);
});

test('rejects an indicator marked as a template', async () => {
	mocks.containers.set(
		indicatorGuid,
		container(indicatorGuid, {
			template: true,
			title: 'CO2 emissions',
			type: 'indicator_template',
			unit: 't'
		})
	);

	await expect(setActualData({ values: [{ value: 1, year: 2024 }] })).rejects.toThrow(
		'The indicator is marked as a template (template: true); actual values cannot be recorded for it.'
	);
	expect(mocks.createAuthorizedContainer).not.toHaveBeenCalled();
});
