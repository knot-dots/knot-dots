import { v4 as uuid } from 'uuid';
import { expect, vi } from 'vitest';
import { z } from 'zod';

const { enqueueIndexingEvent, enqueueIndexingEvents } = vi.hoisted(() => ({
	enqueueIndexingEvent: vi.fn(),
	enqueueIndexingEvents: vi.fn()
}));

vi.mock('$lib/server/indexingQueue', () => ({ enqueueIndexingEvent, enqueueIndexingEvents }));

import { type Fixtures, test } from '$lib/fixtures';
import { newContainer, payloadTypes, predicates } from '$lib/models';
import { createContainer, getAllRelatedContainers, sql } from '$lib/server/db';

const realm = 'test';

async function insert(
	connection: Fixtures['connection'],
	organization: string,
	payload: Record<string, unknown>
) {
	const { guid } = await connection.one(sql.type(z.object({ guid: z.uuid() }))`
		INSERT INTO container (managed_by, organization, payload, realm)
		VALUES (${organization}, ${organization}, ${sql.jsonb(payload)}, ${realm})
		RETURNING guid
	`);
	return guid;
}

function create(
	connection: Fixtures['connection'],
	organization: string,
	payload: Record<string, unknown>,
	{
		organizationalUnit = null,
		relation = []
	}: { organizationalUnit?: string | null; relation?: Record<string, unknown>[] } = {}
) {
	return createContainer(
		newContainer.parse({
			managed_by: organizationalUnit ?? organization,
			organization,
			organizational_unit: organizationalUnit,
			payload,
			realm,
			relation,
			user: []
		})
	)(connection);
}

async function setUp(connection: Fixtures['connection']) {
	const organization = uuid();
	await connection.query(sql.typeAlias('void')`
		INSERT INTO container (guid, managed_by, organization, payload, realm)
		VALUES (
			${organization},
			${organization},
			${organization},
			${sql.jsonb({ name: 'Test organization', type: payloadTypes.enum.organization })},
			${realm}
		)
	`);
	const organizationalUnit = await insert(connection, organization, {
		name: 'Test unit',
		type: payloadTypes.enum.organizational_unit
	});
	const indicator = await create(connection, organization, {
		title: 'Heat action plan adopted',
		type: payloadTypes.enum.binary_indicator
	});
	const objective = await create(
		connection,
		organization,
		{ booleanValue: true, title: 'Heat action plan adopted', type: payloadTypes.enum.objective },
		{
			relation: [
				{ object: indicator.guid, position: 0, predicate: predicates.enum['is-objective-for'] }
			]
		}
	);
	// Recorded by the unit only, so the organization itself has no actual data
	await create(
		connection,
		organization,
		{
			booleanValue: true,
			indicator: indicator.guid,
			title: 'Heat action plan adopted',
			type: payloadTypes.enum.actual_data
		},
		{ organizationalUnit }
	);
	return { indicator, objective, organization };
}

test('relations of objectives bring along actual data of all organizational units', async ({
	connection
}: Fixtures) => {
	const { indicator, organization } = await setUp(connection);

	const containers = await getAllRelatedContainers(
		[organization],
		indicator.guid,
		[predicates.enum['is-objective-for'], predicates.enum['is-measured-by']],
		{ organizationalUnits: [] },
		'alpha'
	)(connection);

	expect(containers.map(({ payload }) => payload.type)).toContain(payloadTypes.enum.actual_data);
});

test('objectives and effects of an indicator load without its actual data', async ({
	connection
}: Fixtures) => {
	const { indicator, objective, organization } = await setUp(connection);

	const containers = await getAllRelatedContainers(
		[organization],
		indicator.guid,
		[predicates.enum['is-objective-for'], predicates.enum['is-measured-by']],
		{
			organizationalUnits: [],
			type: [payloadTypes.enum.objective, payloadTypes.enum.effect]
		},
		'alpha'
	)(connection);

	expect(containers.map(({ guid }) => guid)).toEqual([objective.guid]);
});
