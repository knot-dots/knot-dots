import { v4 as uuid } from 'uuid';
import { expect, vi } from 'vitest';
import { type Fixtures, test } from '$lib/fixtures';
import { type AnyPayload, newContainer, payloadTypes, predicates } from '$lib/models';
import { createContainer, createOrUpdateUser, getContainerByGuid, sql } from '$lib/server/db';

// Run this file with the ComputedManagedBy flag enabled: applyComputedManagedBy
// replaces managed_by with the computed value on all read paths.
vi.mock('$lib/server/features', () => ({
	getFeatures: () => ['ComputedManagedBy']
}));

const organization = uuid();
const realm = 'test';

function newTestContainer(
	type: AnyPayload['type'],
	options: { memberOf?: string; relation?: { object: string; predicate: string }[] } = {}
) {
	return newContainer.parse({
		managed_by: organization,
		organization,
		organizational_unit: null,
		payload: { title: 'Lorem ipsum', type },
		realm,
		relation: options.relation?.map((r, position) => ({ ...r, position })) ?? [],
		user: options.memberOf
			? [{ predicate: predicates.enum['is-member-of'], subject: options.memberOf }]
			: []
	});
}

test('applyComputedManagedBy: replaces managed_by with the computed value on read', async ({
	connection
}: Fixtures) => {
	const member = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid: member, realm, settings: {} })(
		connection
	);
	const program = await createContainer(
		newTestContainer(payloadTypes.enum.program, { memberOf: member })
	)(connection);
	const measure = await createContainer(
		newTestContainer(payloadTypes.enum.measure, {
			relation: [{ object: program.guid, predicate: predicates.enum['is-part-of-program'] }]
		})
	)(connection);

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
	connection
}: Fixtures) => {
	const measure = await createContainer(newTestContainer(payloadTypes.enum.measure))(connection);

	const loaded = await getContainerByGuid(measure.guid)(connection);

	expect(loaded.managed_by).toEqual([organization]);
	expect(loaded.computed_managed_by).toEqual([organization]);
});
