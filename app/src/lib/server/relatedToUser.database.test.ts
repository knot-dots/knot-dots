import { v4 as uuid } from 'uuid';
import { expect, vi } from 'vitest';

const { enqueueIndexingEvent, enqueueIndexingEvents } = vi.hoisted(() => ({
	enqueueIndexingEvent: vi.fn(),
	enqueueIndexingEvents: vi.fn()
}));

vi.mock('$lib/server/indexingQueue', () => ({ enqueueIndexingEvent, enqueueIndexingEvents }));

import { type Fixtures, test } from '$lib/fixtures';
import {
	type AnyPayload,
	newContainer,
	organizationalUnitType,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	createContainer,
	createOrUpdateUser,
	getAllContainersRelatedToUser,
	getTeamGuidsOfUser,
	setContainerGrants
} from '$lib/server/db';

const realm = 'test';

function newTestContainer(
	organization: string,
	type: AnyPayload['type'],
	options: {
		ownMatrix?: boolean;
		payload?: Record<string, unknown>;
		user?: { predicate: string; subject: string }[];
	} = {}
) {
	return {
		...newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: {
				...(type === payloadTypes.enum.organizational_unit
					? { name: 'Lorem ipsum' }
					: { title: 'Lorem ipsum' }),
				...options.payload,
				type
			},
			realm,
			relation: [],
			user: options.user ?? []
		}),
		own_matrix: options.ownMatrix ?? false
	};
}

async function newTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

async function setUp(connection: Fixtures['connection']) {
	const organization = uuid();
	const member = await newTestUser(connection);
	const other = await newTestUser(connection);
	const team = await createContainer(
		newTestContainer(organization, payloadTypes.enum.organizational_unit, {
			payload: {
				organizationalUnitType: organizationalUnitType.enum['organizational_unit_type.team']
			},
			user: [{ predicate: predicates.enum['is-member-of'], subject: member }]
		})
	)(connection);
	return { member, organization, other, team };
}

test('the teams of a user are the units marked as such with a row for the user', async ({
	connection
}: Fixtures) => {
	const { member, organization, other, team } = await setUp(connection);
	// a plain unit with a row does not count as a team
	await createContainer(
		newTestContainer(organization, payloadTypes.enum.organizational_unit, {
			user: [{ predicate: predicates.enum['is-member-of'], subject: member }]
		})
	)(connection);

	expect(await getTeamGuidsOfUser(member)(connection)).toEqual([team.guid]);
	expect(await getTeamGuidsOfUser(other)(connection)).toEqual([]);
});

test('a row of the team on a measure relates the measure to the members', async ({
	connection
}: Fixtures) => {
	const { member, organization, other, team } = await setUp(connection);
	const measure = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { ownMatrix: true })
	)(connection);
	const unrelated = await createContainer(
		newTestContainer(organization, payloadTypes.enum.measure, { ownMatrix: true })
	)(connection);
	await setContainerGrants(measure.guid, team.guid, {
		self: ['read'],
		subordinates: ['read']
	})(connection);

	const related = await getAllContainersRelatedToUser(member)(connection);
	expect(related.map(({ guid }) => guid)).toContain(measure.guid);
	expect(related.map(({ guid }) => guid)).not.toContain(unrelated.guid);

	const otherRelated = await getAllContainersRelatedToUser(other)(connection);
	expect(otherRelated.map(({ guid }) => guid)).not.toContain(measure.guid);
});

test('a task assigned to the team relates to the members', async ({ connection }: Fixtures) => {
	const { member, organization, other, team } = await setUp(connection);
	const task = await createContainer(
		newTestContainer(organization, payloadTypes.enum.task, {
			payload: { assignee: [team.guid] }
		})
	)(connection);

	const related = await getAllContainersRelatedToUser(member)(connection);
	expect(related.map(({ guid }) => guid)).toContain(task.guid);

	const otherRelated = await getAllContainersRelatedToUser(other)(connection);
	expect(otherRelated.map(({ guid }) => guid)).not.toContain(task.guid);
});
