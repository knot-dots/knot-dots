import { v4 as uuid } from 'uuid';
import { expect, vi } from 'vitest';

const { enqueueIndexingEvent, enqueueIndexingEvents } = vi.hoisted(() => ({
	enqueueIndexingEvent: vi.fn(),
	enqueueIndexingEvents: vi.fn()
}));

vi.mock('$lib/server/indexingQueue', () => ({ enqueueIndexingEvent, enqueueIndexingEvents }));

import { type Fixtures, realm, test } from '$lib/fixtures';
import { organizationalUnitType, payloadTypes, predicates } from '$lib/models';
import {
	createOrUpdateUser,
	getAllContainersRelatedToUser,
	setContainerGrants
} from '$lib/server/db';

async function newTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

test('a row of the team on a measure relates the measure to the members', async ({
	connection,
	containers
}) => {
	const member = await newTestUser(connection);
	const other = await newTestUser(connection);
	const team = containers.add(
		{
			organizationalUnitType: organizationalUnitType.enum['organizational_unit_type.team'],
			type: payloadTypes.enum.organizational_unit
		},
		{ user: [{ predicate: predicates.enum['is-member-of'], subject: member }] }
	);
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	const unrelated = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	await containers.persist();
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
