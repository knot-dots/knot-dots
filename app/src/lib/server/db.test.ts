import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { type Fixtures, test } from '$lib/fixtures';
import {
	type AnyPayload,
	type Container,
	type MeasurePayload,
	modifiedContainer,
	type NewContainer,
	newContainer,
	type PartialRelation,
	type PayloadType,
	payloadTypes,
	predicates,
	type ProgramPayload,
	type Relation
} from '$lib/models';
import {
	createContainer,
	createOrUpdateUser,
	deleteContainer,
	getContainerByGuid,
	getManyContainers,
	sql,
	updateContainer,
	updateManyContainerRelations
} from '$lib/server/db';
import { computeManagedBy } from '$lib/server/computeManagedBy';
import { getManyContainersWithES } from '$lib/server/elasticsearch';

const organization = uuid();
const realm = 'test';

function initializeNewContainer(
	payload: Partial<AnyPayload> & Pick<AnyPayload, 'type'>,
	relation: PartialRelation[]
) {
	return newContainer.parse({
		managed_by: organization,
		organization,
		organizational_unit: null,
		payload,
		realm,
		relation
	});
}

const simplePayload = (type: AnyPayload['type']) =>
	({ title: 'Lorem ipsum', type }) as Partial<AnyPayload> & Pick<AnyPayload, 'type'>;

test('containers can be related to each other', async ({ connection }: Fixtures) => {
	const expectedRelations: Relation[] = [];

	const program = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.program
			} as ProgramPayload,
			[]
		)
	)(connection);

	const partOfProgramTypes = [payloadTypes.enum.goal, payloadTypes.enum.measure];

	for (const payloadType of partOfProgramTypes) {
		const i = partOfProgramTypes.indexOf(payloadType);
		const partOfProgram = await createContainer(
			initializeNewContainer(simplePayload(payloadType), [
				{
					object: program.guid,
					position: i,
					predicate: predicates.enum['is-part-of-program']
				}
			])
		)(connection);
		expectedRelations.push(...partOfProgram.relation);
	}

	const programWithRelations = await getContainerByGuid(program.guid)(connection);
	expect(programWithRelations.relation).toEqual(expectedRelations);
});

test('relation positions can be updated', async ({ connection }: Fixtures) => {
	const expectedRelationsOfProgram: Relation[] = [];

	const program = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.program
			} as ProgramPayload,
			[]
		)
	)(connection);

	const partOfProgramTypes = [payloadTypes.enum.goal, payloadTypes.enum.measure];

	for (const payloadType of partOfProgramTypes) {
		const i = partOfProgramTypes.indexOf(payloadType);
		const partOfProgram = await createContainer(
			initializeNewContainer(simplePayload(payloadType), [
				{
					object: program.guid,
					position: i,
					predicate: predicates.enum['is-part-of-program']
				}
			])
		)(connection);
		expectedRelationsOfProgram.push(...partOfProgram.relation);
	}

	const programWithRelations = await getContainerByGuid(program.guid)(connection);
	expect(programWithRelations.relation).toEqual(expectedRelationsOfProgram);

	await updateManyContainerRelations(
		[...programWithRelations.relation.slice(1), programWithRelations.relation[0]].map(
			(r, index) => ({ ...r, position: index })
		)
	)(connection);

	const programWithModifiedRelations = await getContainerByGuid(program.guid)(connection);
	expect(programWithModifiedRelations.relation).toEqual(
		[...expectedRelationsOfProgram.slice(1), expectedRelationsOfProgram[0]].map((r, index) => ({
			...r,
			position: index
		}))
	);
});

test('relations are added or removed when updating a container', async ({
	connection
}: Fixtures) => {
	const expectedRelationsOfProgram: Relation[] = [];

	const program = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.program
			} as ProgramPayload,
			[]
		)
	)(connection);

	const partOfProgramTypes = [payloadTypes.enum.goal, payloadTypes.enum.measure];

	for (const payloadType of partOfProgramTypes) {
		const i = partOfProgramTypes.indexOf(payloadType);
		const partOfProgram = await createContainer(
			initializeNewContainer(simplePayload(payloadType), [
				{
					object: program.guid,
					position: i,
					predicate: predicates.enum['is-part-of-program']
				}
			])
		)(connection);
		expectedRelationsOfProgram.push(...partOfProgram.relation);
	}

	const programWithRelations = await getContainerByGuid(program.guid)(connection);
	expect(programWithRelations.relation).toEqual(expectedRelationsOfProgram);

	const anotherContainer = await createContainer(
		initializeNewContainer(
			{ title: 'Lorem ipsum', type: payloadTypes.enum.measure } as MeasurePayload,
			[]
		)
	)(connection);

	const newRelation = {
		object: program.guid,
		position: 0,
		predicate: predicates.enum['is-part-of-program'],
		subject: anotherContainer.guid
	};

	await updateContainer(
		modifiedContainer.parse({
			...programWithRelations,
			relation: [newRelation, ...programWithRelations.relation.slice(1)]
		})
	)(connection);

	const programWithModifiedRelations = await getContainerByGuid(program.guid)(connection);
	expect(programWithModifiedRelations.relation).toEqual([
		newRelation,
		...expectedRelationsOfProgram.slice(1)
	]);

	const anotherContainerWitRelations = await getContainerByGuid(anotherContainer.guid)(connection);
	expect(anotherContainerWitRelations.relation).toEqual([newRelation]);

	const formerFirstPartOfProgram = await getContainerByGuid(expectedRelationsOfProgram[0].subject)(
		connection
	);
	expect(formerFirstPartOfProgram.relation).toEqual([]);
});

test('adding more relations does not interfere with existing relations', async ({
	connection
}: Fixtures) => {
	const expectedRelationsOfProgram: Relation[] = [];

	const program = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.program
			} as NewContainer & Container<ProgramPayload>['payload'],
			[]
		)
	)(connection);

	const partOfProgramTypes = [payloadTypes.enum.goal, payloadTypes.enum.measure];

	for (const payloadType of partOfProgramTypes) {
		const i = partOfProgramTypes.indexOf(payloadType);
		const partOfProgram = await createContainer(
			initializeNewContainer(simplePayload(payloadType), [
				{
					object: program.guid,
					position: i,
					predicate: predicates.enum['is-part-of-program']
				}
			])
		)(connection);
		expectedRelationsOfProgram.push(...partOfProgram.relation);
	}

	const task = await createContainer(
		initializeNewContainer(simplePayload(payloadTypes.enum.task), [
			{
				object: expectedRelationsOfProgram[1].subject,
				position: 0,
				predicate: predicates.enum['is-part-of']
			}
		])
	)(connection);
	expect(task.relation).toEqual([
		{
			object: expectedRelationsOfProgram[1].subject,
			position: 0,
			predicate: predicates.enum['is-part-of'],
			subject: task.guid
		}
	]);

	const programWithRelations = await getContainerByGuid(program.guid)(connection);
	expect(programWithRelations.relation).toEqual(expectedRelationsOfProgram);
});

type Test = {
	name: string;
	filters: {
		customCategories?: Record<string, string[]>;
		terms?: string;
		type?: PayloadType[];
	};
	sort: string;
};

// These tests compare against Elasticsearch and rely on the sample data seeded by
// the import; skip them where only a migrated database is available (e.g. in CI).
test.skipIf(!process.env.ELASTICSEARCH_INDEX_ALIAS).for([
	{
		name: 'goal',
		filters: { type: [payloadTypes.enum.goal] },
		sort: 'modified'
	},
	{
		name: 'goal with categories',
		filters: { type: [payloadTypes.enum.goal], customCategories: { sdg: ['sdg.11', 'sdg.13'] } },
		sort: 'alpha'
	},
	{
		name: 'goal with audience',
		filters: {
			type: [payloadTypes.enum.goal],
			customCategories: { audience: ['audience.public'] }
		},
		sort: 'modified'
	},
	{
		name: 'indicator',
		filters: { type: [payloadTypes.enum.indicator_template] },
		sort: 'modified'
	},
	{
		name: 'indicator with topics',
		filters: {
			type: [payloadTypes.enum.indicator_template],
			customCategories: { topics: ['topic.health'] }
		},
		sort: 'alpha'
	},
	{
		name: 'knowledge',
		filters: { type: [payloadTypes.enum.knowledge] },
		sort: 'alpha'
	},
	{
		name: 'knowledge with categories',
		filters: { type: [payloadTypes.enum.knowledge], customCategories: { sdg: ['sdg.11'] } },
		sort: 'modified'
	},
	{
		name: 'measure',
		filters: { type: [payloadTypes.enum.measure] },
		sort: 'modified'
	},
	{
		name: 'measure with topics and audience',
		filters: {
			type: [payloadTypes.enum.measure],
			customCategories: {
				topics: ['topic.economy'],
				audience: ['audience.business']
			}
		},
		sort: 'modified'
	},
	{
		name: 'objective',
		filters: { type: [payloadTypes.enum.objective] },
		sort: 'modified'
	},
	{
		name: 'objective with categories',
		filters: {
			type: [payloadTypes.enum.objective],
			customCategories: { sdg: ['sdg.13'] }
		},
		sort: 'alpha'
	},
	{
		name: 'program',
		filters: { type: [payloadTypes.enum.program] },
		sort: 'alpha'
	},
	{
		name: 'program with audience',
		filters: {
			type: [payloadTypes.enum.program],
			customCategories: {
				audience: ['audience.public', 'audience.business']
			}
		},
		sort: 'modified'
	},
	{
		name: 'resource',
		filters: { type: [payloadTypes.enum.resource] },
		sort: 'modified'
	},
	{
		name: 'resource with categories and topics',
		filters: {
			type: [payloadTypes.enum.resource],
			customCategories: {
				sdg: ['sdg.11'],
				topics: ['topic.environment']
			}
		},
		sort: 'alpha'
	},
	{
		name: 'rule',
		filters: { type: [payloadTypes.enum.rule] },
		sort: 'modified'
	},
	{
		name: 'rule with topics',
		filters: { type: [payloadTypes.enum.rule], customCategories: { topic: ['topic.legal'] } },
		sort: 'alpha'
	},
	{
		name: 'task',
		filters: { type: [payloadTypes.enum.task] },
		sort: 'alpha'
	},
	{
		name: 'task with categories',
		filters: { type: [payloadTypes.enum.task], customCategories: { sdg: ['sdg.13'] } },
		sort: 'modified'
	},
	{
		name: 'task with priority sorting',
		filters: { type: [payloadTypes.enum.task] },
		sort: 'priority'
	}
] as Test[])(
	`getManyContainers and getManyContainersWithES: $name`,
	async ({ filters, sort }, { connection }) => {
		// Get the organization GUID for Musterhausen
		const org = await connection.one(sql.typeAlias('guid')`
		SELECT guid FROM container 
		WHERE payload->>'name' = 'Musterhausen' 
		AND payload->>'type' = 'organization'
		LIMIT 1
	`);

		const sqlResults = await getManyContainers([org.guid], filters, sort, {
			limit: 1000
		})(connection);
		const esResults = await getManyContainersWithES([org.guid], filters, sort, {
			limit: 1000
		});

		expect(esResults.containers.length).toBe(sqlResults.length);
		expect(esResults.containers.map((c) => c.guid)).toEqual(sqlResults.map((c) => c.guid));
		expect(esResults.containers.map((c) => c.relation)).toEqual(sqlResults.map((c) => c.relation));
	}
);

async function createTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

function newManagedByContainer(
	type: AnyPayload['type'],
	options: { organizationalUnit?: string; memberOf?: string; relation?: PartialRelation[] } = {}
) {
	return newContainer.parse({
		managed_by: options.organizationalUnit ?? organization,
		organization,
		organizational_unit: options.organizationalUnit ?? null,
		payload: simplePayload(type),
		realm,
		relation: options.relation ?? [],
		user: options.memberOf
			? [{ predicate: predicates.enum['is-member-of'], subject: options.memberOf }]
			: []
	});
}

test('computeManagedBy: program managed by the organization', async ({ connection }: Fixtures) => {
	const program = await createContainer(newManagedByContainer(payloadTypes.enum.program))(
		connection
	);
	const result = await computeManagedBy(connection, [program.guid]);
	expect(result.get(program.guid)).toEqual([organization]);
});

test('computeManagedBy: program managed by the organizational unit', async ({
	connection
}: Fixtures) => {
	const organizationalUnit = uuid();
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { organizationalUnit })
	)(connection);
	const result = await computeManagedBy(connection, [program.guid]);
	expect(result.get(program.guid)).toEqual([organizationalUnit]);
});

test('computeManagedBy: program managed by itself when it has a team', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: member })
	)(connection);
	const result = await computeManagedBy(connection, [program.guid]);
	expect(result.get(program.guid)).toEqual([program.guid]);
});

test('computeManagedBy: measure managed by the organization', async ({ connection }: Fixtures) => {
	const measure = await createContainer(newManagedByContainer(payloadTypes.enum.measure))(
		connection
	);
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([organization]);
});

test('computeManagedBy: measure managed by the organizational unit', async ({
	connection
}: Fixtures) => {
	const organizationalUnit = uuid();
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, { organizationalUnit })
	)(connection);
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([organizationalUnit]);
});

test('computeManagedBy: measure managed by itself when it has a team', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, { memberOf: member })
	)(connection);
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([measure.guid]);
});

test('computeManagedBy: measure managed by its program when only the program has a team', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: member })
	)(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([program.guid]);
});

test('computeManagedBy: measure managed by itself when both program and measure have a team', async ({
	connection
}: Fixtures) => {
	const programMember = await createTestUser(connection);
	const measureMember = await createTestUser(connection);
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: programMember })
	)(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			memberOf: measureMember,
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	// Single-valued stage: the measure's own team wins; the multi-valued [program, measure] case is later.
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([measure.guid]);
});

// The following scenarios reproduce the ways the stored managed_by column went stale
// in production. The computed value must be immune to them by construction.

test('computeManagedBy: measure managed by the organization when its program has no team', async ({
	connection
}: Fixtures) => {
	const program = await createContainer(newManagedByContainer(payloadTypes.enum.program))(
		connection
	);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([organization]);
});

test('computeManagedBy: measure falls back to the organization when the program team loses its members', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: member })
	)(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);

	expect((await computeManagedBy(connection, [measure.guid])).get(measure.guid)).toEqual([
		program.guid
	]);

	const persistedProgram = await getContainerByGuid(program.guid)(connection);
	await updateContainer(modifiedContainer.parse({ ...persistedProgram, user: [] }))(connection);

	expect((await computeManagedBy(connection, [measure.guid])).get(measure.guid)).toEqual([
		organization
	]);
});

test('computeManagedBy: measure falls back to the organization when it is detached from its program', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: member })
	)(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);

	expect((await computeManagedBy(connection, [measure.guid])).get(measure.guid)).toEqual([
		program.guid
	]);

	const persistedMeasure = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(modifiedContainer.parse({ ...persistedMeasure, relation: [] }))(connection);

	expect((await computeManagedBy(connection, [measure.guid])).get(measure.guid)).toEqual([
		organization
	]);
});

test('computeManagedBy: measure falls back to the organization when its program is deleted', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: member })
	)(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);

	expect((await computeManagedBy(connection, [measure.guid])).get(measure.guid)).toEqual([
		program.guid
	]);

	const persistedProgram = await getContainerByGuid(program.guid)(connection);
	await deleteContainer(persistedProgram)(connection);

	expect((await computeManagedBy(connection, [measure.guid])).get(measure.guid)).toEqual([
		organization
	]);
});

test('computeManagedBy: computed value follows the container into another organizational unit', async ({
	connection
}: Fixtures) => {
	const formerUnit = uuid();
	const currentUnit = uuid();
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, { organizationalUnit: formerUnit })
	)(connection);

	expect((await computeManagedBy(connection, [measure.guid])).get(measure.guid)).toEqual([
		formerUnit
	]);

	// Keep managed_by at its old value: this is the most common stale-column case in
	// production, where a move never updated managed_by.
	const persistedMeasure = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(
		modifiedContainer.parse({ ...persistedMeasure, organizational_unit: currentUnit })
	)(connection);

	expect((await computeManagedBy(connection, [measure.guid])).get(measure.guid)).toEqual([
		currentUnit
	]);
});

test('computeManagedBy: goal managed by the program team two levels up', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: member })
	)(connection);
	const goal = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, {
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	const subgoal = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, {
			relation: [{ object: goal.guid, position: 0, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	const result = await computeManagedBy(connection, [subgoal.guid]);
	expect(result.get(subgoal.guid)).toEqual([program.guid]);
});

test('computeManagedBy: cyclic relations do not prevent computation', async ({
	connection
}: Fixtures) => {
	const goal = await createContainer(newManagedByContainer(payloadTypes.enum.goal))(connection);
	const otherGoal = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, {
			relation: [{ object: goal.guid, position: 0, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);

	const persistedGoal = await getContainerByGuid(goal.guid)(connection);
	await updateContainer(
		modifiedContainer.parse({
			...persistedGoal,
			relation: [
				...persistedGoal.relation,
				{
					object: otherGoal.guid,
					position: 0,
					predicate: predicates.enum['is-part-of'],
					subject: goal.guid
				}
			]
		})
	)(connection);

	const result = await computeManagedBy(connection, [goal.guid, otherGoal.guid]);
	expect(result.get(goal.guid)).toEqual([organization]);
	expect(result.get(otherGoal.guid)).toEqual([organization]);
});
