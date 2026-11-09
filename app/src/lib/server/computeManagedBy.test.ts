import { v4 as uuid } from 'uuid';
import { expect, vi } from 'vitest';
import { realm, test } from '$lib/fixtures';
import { payloadTypes, predicates } from '$lib/models';
import { createOrUpdateUser, getContainerByGuid, sql } from '$lib/server/db';

// Run this file with the ComputedManagedBy flag enabled: applyComputedManagedBy
// replaces managed_by with the computed value on all read paths.
vi.mock('$lib/server/features', () => ({
	getFeatures: () => ['ComputedManagedBy']
}));

test('applyComputedManagedBy: replaces managed_by with the computed value on read', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const member = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid: member, realm, settings: {} })(
		connection
	);
	const program = containers.add(
		{ type: payloadTypes.enum.program },
		{ user: [{ predicate: predicates.enum['is-member-of'], subject: member }] }
	);
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();

	const loaded = await getContainerByGuid(measure.guid)(connection);

	expect(loaded.managed_by).toEqual([program.guid]);
	expect(loaded.computed_managed_by).toEqual([program.guid]);

	// The stored column is untouched by the read.
	const stored = await connection.oneFirst(sql.unsafe`
		SELECT managed_by FROM container
		WHERE guid = ${measure.guid} AND valid_currently AND NOT deleted
	`);
	expect(stored).toBe(organization);
});

test('applyComputedManagedBy: keeps the stored value when it matches', async ({
	connection,
	containers,
	organization
}) => {
	const measure = containers.add({ type: payloadTypes.enum.measure });
	await containers.persist();

	const loaded = await getContainerByGuid(measure.guid)(connection);

	expect(loaded.managed_by).toEqual([organization]);
	expect(loaded.computed_managed_by).toEqual([organization]);
});

test('applyComputedManagedBy: a decoupled container manages itself even without members', async ({
	connection,
	containers
}) => {
	// Otherwise it would fall back to the scope, whose subordinate grants it
	// just opted out of by decoupling its grant matrix.
	const measure = containers.add({ type: payloadTypes.enum.measure }, { own_matrix: true });
	await containers.persist();

	const loaded = await getContainerByGuid(measure.guid)(connection);

	expect(loaded.managed_by).toEqual([measure.guid]);
	expect(loaded.computed_managed_by).toEqual([measure.guid]);
});
