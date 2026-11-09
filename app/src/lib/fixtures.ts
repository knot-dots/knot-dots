import type { DatabaseTransactionConnection } from 'slonik';
import { v4 as uuid } from 'uuid';
import { test as base } from 'vitest';
import { z } from 'zod';
import {
	type AnyPayload,
	anyPayload,
	type Container,
	getPayloadSchema,
	newContainer,
	type PayloadType,
	type Predicate,
	relation,
	type Relation
} from '$lib/models';
import type { NewContainerWithGuid } from '$lib/server/containerCopyPlan';
import { createManyContainerRelations, createManyContainers, getPool } from '$lib/server/db';

export interface Fixtures {
	connection: DatabaseTransactionConnection;
}

export const realm = 'test';

// Fills in a title, or a name for the payload types that have one instead, so that
// fixtures only need to spell out what a test is about.
const payloadWithTitle = z.preprocess((payload) => {
	if (typeof payload !== 'object' || payload === null || !('type' in payload)) {
		return payload;
	}
	const { shape } = getPayloadSchema(payload.type as PayloadType);
	const defaults =
		'title' in shape ? { title: 'Lorem ipsum' } : 'name' in shape ? { name: 'Lorem ipsum' } : {};
	return { ...defaults, ...payload };
}, anyPayload);

/**
 * A new container with its GUID decided in advance, so that it can be related to other
 * fixtures and referenced in payloads before anything is written to the database.
 * Without an explicit managed_by it is managed by its organizational unit, if it has
 * one, or by its organization. Relations between containers are fixtures of their own,
 * so relation is left empty.
 */
export function containerFixtureSchema({ organization }: { organization: string }) {
	return newContainer
		.extend({
			guid: z.uuid().default(() => uuid()),
			managed_by: newContainer.shape.managed_by.optional(),
			organization: z.uuid().default(organization),
			organizational_unit: z.uuid().nullable().default(null),
			payload: payloadWithTitle,
			realm: z.string().default(realm),
			relation: z.array(relation).default(() => [])
		})
		.transform(({ managed_by, ...container }) => ({
			...container,
			managed_by: managed_by ?? [container.organizational_unit ?? container.organization]
		}));
}

export type ContainerFixtureOptions = Omit<
	z.input<ReturnType<typeof containerFixtureSchema>>,
	'payload' | 'relation'
>;

export type PayloadFixture = Partial<AnyPayload> & Pick<AnyPayload, 'type'>;

/**
 * Collects the containers a test starts from and writes the ones added since the last
 * call of persist() in bulk.
 */
export interface ContainerFixtures {
	add(payload: PayloadFixture, options?: ContainerFixtureOptions): NewContainerWithGuid;
	persist(): Promise<Container<AnyPayload>[]>;
}

export function createContainerFixtures(
	connection: DatabaseTransactionConnection,
	defaults: { organization: string }
): ContainerFixtures {
	const schema = containerFixtureSchema(defaults);
	const pending: NewContainerWithGuid[] = [];

	return {
		add(payload, options = {}) {
			const fixture = schema.parse({ ...options, payload });
			pending.push(fixture);
			return fixture;
		},
		async persist() {
			const { containers } = await createManyContainers(pending.splice(0))(connection);
			return containers;
		}
	};
}

/**
 * Collects the relations between containers a test starts from and writes the ones
 * added since the last call of persist() in bulk, after the containers they relate.
 */
export interface RelationFixtures {
	add(
		subject: NewContainerWithGuid,
		predicate: Predicate,
		object: NewContainerWithGuid,
		position?: number
	): Relation;
	persist(): Promise<readonly Relation[]>;
}

export function createRelationFixtures(
	connection: DatabaseTransactionConnection
): RelationFixtures {
	const pending: Relation[] = [];

	return {
		add(subject, predicate, object, position = 0) {
			const added = { object: object.guid, position, predicate, subject: subject.guid };
			pending.push(added);
			return added;
		},
		persist() {
			return createManyContainerRelations(pending.splice(0))(connection);
		}
	};
}

export const test = base
	.extend<Fixtures>({
		// eslint-disable-next-line no-empty-pattern
		connection: async ({}, use) => {
			const pool = await getPool();
			try {
				await pool.transaction(async (connection) => {
					await use(connection);
					throw new Error('trigger rollback');
				});
			} catch (e) {
				if (!(e instanceof Error) || e.message !== 'trigger rollback') {
					throw e;
				}
			}
		}
	})
	// The organization that containers belong to unless a test says otherwise.
	.extend('organization', () => uuid())
	.extend('containers', ({ connection, organization }) =>
		createContainerFixtures(connection, { organization })
	)
	.extend('relations', ({ connection }) => createRelationFixtures(connection));
