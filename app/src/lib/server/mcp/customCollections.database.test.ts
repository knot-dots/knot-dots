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
import {
	addCustomCollectionSectionInput,
	updateCustomCollectionSectionInput
} from '$lib/server/mcp/contracts/customCollections';
import {
	addMcpCustomCollectionSection,
	updateMcpCustomCollectionSection
} from '$lib/server/mcp/customCollections';
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
	member: string,
	role: Predicate
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

	await connection.query(sql.typeAlias('void')`
		INSERT INTO container_user (object, predicate, subject)
		VALUES
			(${revision}, ${predicates.enum['is-member-of']}, ${member}),
			(${revision}, ${role}, ${member})
		ON CONFLICT DO NOTHING
	`);

	return guid;
}

async function createProgram(connection: Fixtures['connection'], organization: string) {
	return createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: { title: 'Climate program', type: payloadTypes.enum.program },
			realm,
			relation: [],
			user: []
		})
	)(connection);
}

async function findWriteEvents(connection: Fixtures['connection'], tokenId: string) {
	return connection.any(sql.type(
		z.object({ container_guid: z.uuid(), revision: z.number().nullable(), tool: z.string() })
	)`
		SELECT container_guid, revision, tool
		FROM mcp_write_event
		WHERE token_id = ${tokenId}
		ORDER BY created_at, revision
	`);
}

function addCollection(auth: McpAuth, parentGuid: string) {
	return addMcpCustomCollectionSection({
		...addCustomCollectionSectionInput.parse({
			parentGuid,
			title: 'Climate goals',
			types: [payloadTypes.enum.goal]
		}),
		...auth
	});
}

function updateCollection(
	auth: McpAuth,
	guid: string,
	expectedRevision: number,
	settings: Record<string, unknown>
) {
	return updateMcpCustomCollectionSection({
		...updateCustomCollectionSectionInput.parse({ expectedRevision, guid, ...settings }),
		...auth
	});
}

test('adds a collection to a program and updates it with the returned revision', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-collaborator-of']
	);
	const program = await createProgram(connection, organization);

	const { section: added } = await addCollection(auth, program.guid)(connection);
	const { section: updated } = await updateCollection(auth, added.guid, added.revision, {
		includeSubordinateOrganizationalUnits: false,
		listType: 'carousel',
		title: 'Our climate goals'
	})(connection);

	expect(added).toMatchObject({
		organizationScope: { includeSubordinateOrganizationalUnits: true, type: 'current' },
		parentGuid: program.guid,
		types: [payloadTypes.enum.goal]
	});
	expect(updated.revision).toBeGreaterThan(added.revision);
	const stored = await getContainerByGuid(added.guid)(connection);
	expect(stored).toMatchObject({
		organization,
		payload: {
			filter: { organization: ['current'], organizationalUnit: [''], type: ['goal'] },
			listType: 'carousel',
			title: 'Our climate goals',
			type: payloadTypes.enum.custom_collection
		},
		revision: updated.revision
	});
	expect(stored.relation).toContainEqual(
		expect.objectContaining({
			object: program.guid,
			position: 0,
			predicate: predicates.enum['is-section-of'],
			subject: added.guid
		})
	);
	await expect(findWriteEvents(connection, auth.tokenId)).resolves.toEqual([
		{
			container_guid: added.guid,
			revision: added.revision,
			tool: 'add_custom_collection_section'
		},
		{
			container_guid: added.guid,
			revision: updated.revision,
			tool: 'update_custom_collection_section'
		}
	]);
});

test('rejects an update for a revision that is no longer current', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-collaborator-of']
	);
	const program = await createProgram(connection, organization);
	const { section } = await addCollection(auth, program.guid)(connection);

	await updateCollection(auth, section.guid, section.revision, { title: 'First' })(connection);

	await expect(
		updateCollection(auth, section.guid, section.revision, { title: 'Second' })(connection)
	).rejects.toThrow(`The container changed since revision ${section.revision}.`);
});

test('rejects adding a collection for a user who may only observe the organization', async ({
	connection
}: Fixtures) => {
	const auth = await createTestAuth(connection);
	const organization = await createOrganization(
		connection,
		auth.userId,
		predicates.enum['is-member-of']
	);
	const program = await createProgram(connection, organization);

	await expect(addCollection(auth, program.guid)(connection)).rejects.toThrow(
		'You are not allowed to create content in this context.'
	);
});
