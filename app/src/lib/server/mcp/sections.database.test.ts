import { locale } from 'svelte-i18n';
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
import {
	createContainer,
	createMcpToken,
	createOrUpdateUser,
	getContainerByGuid,
	sql
} from '$lib/server/db';
import type { McpAuth } from '$lib/server/mcp/auth';
import { addSectionInput, updateSectionInput } from '$lib/server/mcp/contracts/sections';
import { addMcpSection, updateMcpSection } from '$lib/server/mcp/sections';
import { generateMcpToken } from '$lib/server/mcp/tokens';

// Like hooks.server.ts, as containerOfType resolves the default titles.
locale.set('de');

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

async function addMember(connection: Fixtures['connection'], revision: number, member: string) {
	await connection.query(sql.typeAlias('void')`
		INSERT INTO container_user (object, predicate, subject)
		VALUES
			(${revision}, ${predicates.enum['is-member-of']}, ${member}),
			(${revision}, ${predicates.enum['is-collaborator-of']}, ${member})
		ON CONFLICT DO NOTHING
	`);
}

async function createOrganization(connection: Fixtures['connection'], member: string) {
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
	await addMember(connection, revision, member);
	return guid;
}

async function createMeasure(connection: Fixtures['connection'], organization: string) {
	return createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: { title: 'Cycle paths', type: payloadTypes.enum.measure },
			realm,
			relation: [],
			user: []
		})
	)(connection);
}

async function createUnit(
	connection: Fixtures['connection'],
	organization: string,
	member: string
) {
	const unit = await createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: { level: 1, name: 'Old town', type: payloadTypes.enum.organizational_unit },
			realm,
			relation: [],
			user: []
		})
	)(connection);
	await addMember(connection, unit.revision, member);
	return unit;
}

async function findWriteEvents(connection: Fixtures['connection'], tokenId: string) {
	return connection.any(sql.type(z.object({ container_guid: z.uuid(), tool: z.string() }))`
		SELECT container_guid, tool
		FROM mcp_write_event
		WHERE token_id = ${tokenId}
		ORDER BY created_at, revision
	`);
}

function add(auth: McpAuth, input: Record<string, unknown>) {
	return addMcpSection({ ...addSectionInput.parse(input), ...auth });
}

test('appends data view sections to a measure once each', async ({ connection }: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(connection, auth.userId);
	const measure = await createMeasure(connection, organization);

	const goals = await add(auth, { parentGuid: measure.guid, type: 'goal_collection' })(connection);
	const progress = await add(auth, {
		measurement: 'subordinateObjects',
		objectType: 'task',
		parentGuid: measure.guid,
		type: 'progress'
	})(connection);

	await expect(getContainerByGuid(goals.guid)(connection)).resolves.toMatchObject({
		organization,
		organizational_unit: null,
		payload: { title: 'Ziele', type: payloadTypes.enum.goal_collection }
	});
	const storedProgress = await getContainerByGuid(progress.guid)(connection);
	expect(storedProgress).toMatchObject({
		payload: {
			measurement: 'subordinateObjects',
			objectType: 'task',
			title: 'Fortschritt',
			type: payloadTypes.enum.progress
		}
	});
	expect(storedProgress.relation).toContainEqual(
		expect.objectContaining({
			object: measure.guid,
			position: 1,
			predicate: predicates.enum['is-section-of'],
			subject: progress.guid
		})
	);
	await expect(
		add(auth, { parentGuid: measure.guid, type: 'goal_collection' })(connection)
	).rejects.toThrow('The measure has a goal_collection section already.');
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual([
		{ container_guid: goals.guid, tool: 'add_section' },
		{ container_guid: progress.guid, tool: 'add_section' }
	]);
});

test('adds a section of an organizational unit to the unit', async ({ connection }: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(connection, auth.userId);
	const unit = await createUnit(connection, organization, auth.userId);

	const map = await add(auth, { parentGuid: unit.guid, type: 'map' })(connection);

	expect(map).toMatchObject({ label: 'Gebietsgrenze', organizationalUnitGuid: unit.guid });
	await expect(getContainerByGuid(map.guid)(connection)).resolves.toMatchObject({
		managed_by: [unit.guid],
		organizational_unit: unit.guid
	});
});

test('changes a section with the revision add_section returned', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(connection, auth.userId);
	const measure = await createMeasure(connection, organization);
	const progress = await add(auth, { parentGuid: measure.guid, type: 'progress' })(connection);

	const updated = await updateMcpSection({
		...updateSectionInput.parse({
			color: 'color.gray',
			expectedRevision: progress.revision,
			guid: progress.guid,
			measurement: 'subordinateObjects',
			objectType: 'measure'
		}),
		...auth
	})(connection);

	expect(updated.revision).toBeGreaterThan(progress.revision);
	await expect(getContainerByGuid(progress.guid)(connection)).resolves.toMatchObject({
		payload: {
			color: 'color.gray',
			measurement: 'subordinateObjects',
			objectType: 'measure',
			title: 'Fortschritt',
			type: payloadTypes.enum.progress
		},
		revision: updated.revision
	});
	await expect(
		updateMcpSection({
			...updateSectionInput.parse({
				color: 'color.blue',
				expectedRevision: progress.revision,
				guid: progress.guid
			}),
			...auth
		})(connection)
	).rejects.toThrow(`The container changed since revision ${progress.revision}.`);
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual([
		{ container_guid: progress.guid, tool: 'add_section' },
		{ container_guid: progress.guid, tool: 'update_section' }
	]);
});
