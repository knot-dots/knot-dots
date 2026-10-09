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
import { attachIndicatorInput } from '$lib/server/mcp/contracts/indicators';
import { attachMcpIndicator } from '$lib/server/mcp/indicators';
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
	const measure = await create(connection, organization, {
		title: 'Bike lanes',
		type: payloadTypes.enum.measure
	});
	return { auth, indicator, measure, organization };
}

function attach(auth: McpAuth, targetGuid: string, indicatorGuid: string) {
	return attachMcpIndicator({
		...attachIndicatorInput.parse({ indicatorGuid, targetGuid }),
		...auth
	});
}

test('attaches a public indicator of another organization to a measure through an effect', async ({
	connection
}: Fixtures) => {
	const { auth, indicator, measure, organization } = await setUp(
		connection,
		predicates.enum['is-collaborator-of']
	);

	const first = await attach(auth, measure.guid, indicator.guid)(connection);
	const second = await attach(auth, measure.guid, indicator.guid)(connection);

	expect(first).toMatchObject({ attachment: { type: 'effect' }, changed: true });
	expect(second).toEqual({ ...first, changed: false });
	const effect = await getContainerByGuid(first.attachment.guid)(connection);
	expect(effect).toMatchObject({
		organization,
		payload: { title: 'CO2 emissions', type: payloadTypes.enum.effect }
	});
	expect(effect.relation).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				object: indicator.guid,
				predicate: predicates.enum['is-measured-by'],
				subject: effect.guid
			}),
			expect.objectContaining({
				object: measure.guid,
				predicate: predicates.enum['is-part-of'],
				subject: effect.guid
			})
		])
	);
	await expect(
		connection.oneFirst(sql.type(z.object({ count: z.number() }))`
			SELECT count(*)::int AS count
			FROM mcp_write_event
			WHERE token_id = ${auth.tokenId} AND container_guid = ${effect.guid}
				AND tool = 'attach_indicator'
		`)
	).resolves.toBe(1);
});

test('rejects attaching an indicator for a user who may only observe the organization', async ({
	connection
}: Fixtures) => {
	const { auth, indicator, measure } = await setUp(connection, predicates.enum['is-member-of']);

	await expect(attach(auth, measure.guid, indicator.guid)(connection)).rejects.toThrow(
		'You are not allowed to create content in this context.'
	);
});
