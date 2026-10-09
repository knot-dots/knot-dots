import { v4 as uuid } from 'uuid';
import { expect, vi } from 'vitest';
import { z } from 'zod';

const { enqueueIndexingEvent, enqueueIndexingEvents } = vi.hoisted(() => ({
	enqueueIndexingEvent: vi.fn(),
	enqueueIndexingEvents: vi.fn()
}));

vi.mock('$lib/server/indexingQueue', () => ({ enqueueIndexingEvent, enqueueIndexingEvents }));

import { type Fixtures, test } from '$lib/fixtures';
import { newContainer, payloadTypes, predicates, type Predicate } from '$lib/models';
import {
	createContainer,
	createMcpToken,
	createOrUpdateUser,
	getContainerByGuid,
	sql
} from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import { setMcpActualData } from '$lib/server/mcp/actualData';
import { setActualDataInput } from '$lib/server/mcp/contracts/actualData';
import { generateMcpToken } from '$lib/server/mcp/tokens';

const realm = 'test';

async function createTestAuth(connection: Fixtures['connection']): Promise<McpAuth> {
	const userId = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid: userId, realm, settings: {} })(
		connection
	);
	const { prefix, secretHash } = generateMcpToken();
	const token = await createMcpToken({
		name: 'Test token',
		prefix,
		scopes: ['containers:write'],
		secretHash,
		userId
	})(connection);
	return { tokenId: token.id, userId };
}

async function createOrganization(
	connection: Fixtures['connection'],
	member?: { guid: string; role: Predicate }
) {
	const guid = uuid();
	const { revision } = await connection.one(sql.typeAlias('revision')`
		INSERT INTO container (guid, managed_by, organization, payload, realm)
		VALUES (
			${guid},
			${guid},
			${guid},
			${sql.jsonb({ name: 'Test organization', type: payloadTypes.enum.organization })},
			${realm}
		)
		RETURNING revision
	`);

	if (member) {
		await connection.query(sql.typeAlias('void')`
			INSERT INTO container_user (object, predicate, subject)
			VALUES
				(${revision}, ${predicates.enum['is-member-of']}, ${member.guid}),
				(${revision}, ${member.role}, ${member.guid})
			ON CONFLICT DO NOTHING
		`);
	}

	return guid;
}

function create(
	connection: Fixtures['connection'],
	organization: string,
	payload: Record<string, unknown>
) {
	return createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload,
			realm,
			relation: [],
			user: []
		})
	)(connection);
}

async function setUp(connection: Fixtures['connection'], role: Predicate) {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(connection, { guid: auth.userId, role });
	// a public template of another organization, such as the default one
	const templateOwner = await createOrganization(connection);
	const indicator = await create(connection, templateOwner, {
		title: 'CO2 emissions',
		type: payloadTypes.enum.indicator_template,
		unit: 't',
		visibility: 'public'
	});
	return { auth, indicator, organization };
}

function setValues(
	auth: McpAuth,
	organizationGuid: string,
	indicatorGuid: string,
	values: Array<{ value: number; year: number }>
) {
	return setMcpActualData({
		...setActualDataInput.parse({ indicatorGuid, organizationGuid, values }),
		...auth
	});
}

test('records and merges actual values of a public indicator for an organization', async ({
	connection
}: Fixtures) => {
	const { auth, indicator, organization } = await setUp(
		connection,
		predicates.enum['is-collaborator-of']
	);

	const first = await setValues(auth, organization, indicator.guid, [
		{ value: 430, year: 2023 },
		{ value: 412, year: 2024 }
	])(connection);
	const second = await setValues(auth, organization, indicator.guid, [
		{ value: 410, year: 2024 },
		{ value: 395, year: 2025 }
	])(connection);

	expect(first).toMatchObject({ created: true });
	expect(second).toMatchObject({
		actualData: {
			guid: first.actualData.guid,
			values: [
				{ value: 430, year: 2023 },
				{ value: 410, year: 2024 },
				{ value: 395, year: 2025 }
			]
		},
		created: false
	});
	await expect(getContainerByGuid(first.actualData.guid)(connection)).resolves.toMatchObject({
		organization,
		organizational_unit: null,
		payload: {
			indicator: indicator.guid,
			type: payloadTypes.enum.actual_data,
			values: [
				[2023, 430],
				[2024, 410],
				[2025, 395]
			]
		}
	});
	await expect(
		connection.oneFirst(sql.type(z.object({ count: z.number() }))`
			SELECT count(*)::int AS count
			FROM mcp_write_event
			WHERE token_id = ${auth.tokenId} AND container_guid = ${first.actualData.guid}
				AND tool = 'set_actual_data'
		`)
	).resolves.toBe(2);
});

test('rejects recording actual values for a user who may only observe the organization', async ({
	connection
}: Fixtures) => {
	const { auth, indicator, organization } = await setUp(
		connection,
		predicates.enum['is-member-of']
	);

	await expect(
		setValues(auth, organization, indicator.guid, [{ value: 1, year: 2024 }])(connection)
	).rejects.toThrow('You are not allowed to create content in this context.');
});
