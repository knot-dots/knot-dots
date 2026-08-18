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
	resourceDataTypes,
	type Relation,
	visibility
} from '$lib/models';
import {
	createContainer,
	createOrUpdateUser,
	deleteContainer,
	getAllContainersRelatedToProgram,
	getContainerCopyGraph,
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

test('a container in several programs appears among the members of each', async ({
	connection
}: Fixtures) => {
	const firstProgram = await createContainer(newManagedByContainer(payloadTypes.enum.program))(
		connection
	);
	const secondProgram = await createContainer(newManagedByContainer(payloadTypes.enum.program))(
		connection
	);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{
					object: firstProgram.guid,
					position: 0,
					predicate: predicates.enum['is-part-of-program']
				},
				{
					object: secondProgram.guid,
					position: 0,
					predicate: predicates.enum['is-part-of-program']
				}
			]
		})
	)(connection);

	const relatedToFirst = await getAllContainersRelatedToProgram(firstProgram.guid, {})(connection);
	const relatedToSecond = await getAllContainersRelatedToProgram(
		secondProgram.guid,
		{}
	)(connection);
	expect(relatedToFirst.map(({ guid }) => guid)).toContain(measure.guid);
	expect(relatedToSecond.map(({ guid }) => guid)).toContain(measure.guid);
});

test('getContainerCopyGraph follows current downward copy edges once and stops at cycles', async ({
	connection
}: Fixtures) => {
	const root = await createContainer(newManagedByContainer(payloadTypes.enum.program))(connection);
	const child = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: root.guid,
					position: 7,
					predicate: predicates.enum['is-section-of']
				}
			]
		})
	)(connection);
	const grandchild = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: child.guid,
					position: 8,
					predicate: predicates.enum['is-part-of-category']
				}
			]
		})
	)(connection);
	await updateManyContainerRelations([
		{
			object: grandchild.guid,
			position: 9,
			predicate: predicates.enum['is-part-of'],
			subject: root.guid
		}
	])(connection);

	const deletedIntermediate = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: root.guid,
					position: 10,
					predicate: predicates.enum['is-part-of-measure']
				}
			]
		})
	)(connection);
	const belowDeleted = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: deletedIntermediate.guid,
					position: 11,
					predicate: predicates.enum['is-part-of-program']
				}
			]
		})
	)(connection);
	await connection.query(sql.typeAlias('void')`
		UPDATE container
		SET deleted = true
		WHERE guid = ${deletedIntermediate.guid}
			AND valid_currently
	`);

	const privateIndicator = await createContainer(
		initializeNewContainer(
			{
				title: 'Private indicator',
				type: payloadTypes.enum.indicator_template,
				unit: 'unit.percent',
				visibility: visibility.enum.organization
			},
			[]
		)
	)(connection);
	const payloadOnlyIndicator = await createContainer(
		initializeNewContainer(
			{
				title: 'Payload-only indicator',
				type: payloadTypes.enum.indicator_template,
				unit: 'unit.percent',
				visibility: visibility.enum.organization
			},
			[]
		)
	)(connection);
	const privateIndicatorSection = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: privateIndicator.guid,
					position: 12,
					predicate: predicates.enum['is-section-of']
				}
			]
		})
	)(connection);
	const actualData = await createContainer(
		initializeNewContainer(
			{
				indicator: payloadOnlyIndicator.guid,
				title: 'Actual data',
				type: payloadTypes.enum.actual_data
			},
			[
				{
					object: root.guid,
					position: 13,
					predicate: predicates.enum['is-part-of']
				}
			]
		)
	)(connection);
	const publicIndicator = await createContainer(
		initializeNewContainer(
			{
				title: 'Public indicator',
				type: payloadTypes.enum.indicator_template,
				unit: 'unit.percent',
				visibility: visibility.enum.public
			},
			[]
		)
	)(connection);
	const publicIndicatorSection = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: publicIndicator.guid,
					position: 14,
					predicate: predicates.enum['is-section-of']
				}
			]
		})
	)(connection);
	await updateManyContainerRelations([
		{
			object: privateIndicator.guid,
			position: 15,
			predicate: predicates.enum['is-measured-by'],
			subject: root.guid
		},
		{
			object: publicIndicator.guid,
			position: 16,
			predicate: predicates.enum['is-objective-for'],
			subject: root.guid
		}
	])(connection);

	const result = await getContainerCopyGraph(root.guid)(connection);
	const resultGuids = result.containers.map(({ guid }) => guid);

	expect(resultGuids).toEqual([...new Set(resultGuids)]);
	expect(resultGuids).toEqual(
		expect.arrayContaining([
			root.guid,
			child.guid,
			grandchild.guid,
			actualData.guid,
			privateIndicator.guid,
			privateIndicatorSection.guid,
			publicIndicator.guid
		])
	);
	expect(resultGuids).not.toContain(deletedIntermediate.guid);
	expect(resultGuids).not.toContain(belowDeleted.guid);
	expect(resultGuids).not.toContain(payloadOnlyIndicator.guid);
	expect(resultGuids).not.toContain(publicIndicatorSection.guid);
	expect(
		result.containers
			.flatMap(({ relation }) => relation)
			.find(
				({ predicate, subject }) =>
					predicate === predicates.enum['is-section-of'] && subject === child.guid
			)?.position
	).toBe(7);
});

test('getContainerCopyGraph ignores actual data references and follows resource data references forward only', async ({
	connection
}: Fixtures) => {
	const indicator = await createContainer(
		initializeNewContainer(
			{
				title: 'Indicator',
				type: payloadTypes.enum.indicator_template,
				unit: 'unit.percent',
				visibility: visibility.enum.organization
			},
			[]
		)
	)(connection);
	const actualData = await createContainer(
		initializeNewContainer(
			{
				indicator: indicator.guid,
				title: 'Actual data',
				type: payloadTypes.enum.actual_data
			},
			[]
		)
	)(connection);
	const resource = await createContainer(
		initializeNewContainer(
			{
				title: 'Resource',
				type: payloadTypes.enum.resource_v2,
				visibility: visibility.enum.organization
			},
			[]
		)
	)(connection);
	const resourceData = await createContainer(
		initializeNewContainer(
			{
				resource: resource.guid,
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
				title: 'Resource data',
				type: payloadTypes.enum.resource_data
			},
			[]
		)
	)(connection);

	const guidsFor = async (rootGuid: string) =>
		(await getContainerCopyGraph(rootGuid)(connection)).containers.map(({ guid }) => guid);

	expect(await guidsFor(actualData.guid)).toEqual([actualData.guid]);
	expect(await guidsFor(indicator.guid)).toEqual([indicator.guid]);
	expect(await guidsFor(resourceData.guid)).toEqual(
		expect.arrayContaining([resourceData.guid, resource.guid])
	);
	expect(await guidsFor(resource.guid)).toEqual([resource.guid]);
});

test('getContainerCopyGraph fetches collection references without traversing their descendants', async ({
	connection
}: Fixtures) => {
	const item = await createContainer(newManagedByContainer(payloadTypes.enum.text))(connection);
	const itemChild = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: item.guid,
					position: 1,
					predicate: predicates.enum['is-section-of']
				}
			]
		})
	)(connection);
	const template = await createContainer(
		initializeNewContainer(
			{
				template: true,
				title: 'Template',
				type: payloadTypes.enum.report
			},
			[]
		)
	)(connection);
	const collection = await createContainer(
		initializeNewContainer(
			{
				item: [item.guid],
				newItemTemplate: [template.guid],
				title: 'Collection',
				type: payloadTypes.enum.custom_collection
			},
			[]
		)
	)(connection);

	const result = await getContainerCopyGraph(collection.guid)(connection);
	const resultGuids = result.containers.map(({ guid }) => guid);

	expect(resultGuids).toEqual(expect.arrayContaining([collection.guid, item.guid, template.guid]));
	expect(resultGuids).not.toContain(itemChild.guid);
});

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

test('computeManagedBy: measure managed by both teams when program and measure have one', async ({
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
	// Nearest first: the measure's own team precedes the program's team.
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([measure.guid, program.guid]);
});

test('computeManagedBy: teams accumulate across all levels, nearest first', async ({
	connection
}: Fixtures) => {
	const programMember = await createTestUser(connection);
	const goalMember = await createTestUser(connection);
	const subgoalMember = await createTestUser(connection);
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: programMember })
	)(connection);
	const goal = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, {
			memberOf: goalMember,
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	const subgoal = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, {
			memberOf: subgoalMember,
			relation: [{ object: goal.guid, position: 0, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	const result = await computeManagedBy(connection, [subgoal.guid]);
	expect(result.get(subgoal.guid)).toEqual([subgoal.guid, goal.guid, program.guid]);
});

test('computeManagedBy: teamed ancestors reachable via several paths appear once', async ({
	connection
}: Fixtures) => {
	const firstMember = await createTestUser(connection);
	const secondMember = await createTestUser(connection);
	const firstProgram = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: firstMember })
	)(connection);
	const secondProgram = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: secondMember })
	)(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{
					object: firstProgram.guid,
					position: 0,
					predicate: predicates.enum['is-part-of-program']
				},
				{
					object: secondProgram.guid,
					position: 0,
					predicate: predicates.enum['is-part-of-program']
				}
			]
		})
	)(connection);
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([firstProgram.guid, secondProgram.guid].toSorted());
});

test('computeManagedBy: a teamed ancestor shared by two paths appears once', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const teamedRoot = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, { memberOf: member })
	)(connection);
	const firstBranch = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, {
			relation: [{ object: teamedRoot.guid, position: 0, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	const secondBranch = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, {
			relation: [{ object: teamedRoot.guid, position: 0, predicate: predicates.enum['is-part-of'] }]
		})
	)(connection);
	const leaf = await createContainer(
		newManagedByContainer(payloadTypes.enum.goal, {
			relation: [
				{ object: firstBranch.guid, position: 0, predicate: predicates.enum['is-part-of'] },
				{ object: secondBranch.guid, position: 0, predicate: predicates.enum['is-part-of'] }
			]
		})
	)(connection);
	const result = await computeManagedBy(connection, [leaf.guid]);
	expect(result.get(leaf.guid)).toEqual([teamedRoot.guid]);
});

test('computeManagedBy: measure keeps only its own team under a teamless program', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const program = await createContainer(newManagedByContainer(payloadTypes.enum.program))(
		connection
	);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			memberOf: member,
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([measure.guid]);
});

test('computeManagedBy: the organizational unit never accompanies a team', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const organizationalUnit = uuid();
	const program = await createContainer(
		newManagedByContainer(payloadTypes.enum.program, { memberOf: member })
	)(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			organizationalUnit,
			relation: [
				{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
			]
		})
	)(connection);
	const result = await computeManagedBy(connection, [measure.guid]);
	expect(result.get(measure.guid)).toEqual([program.guid]);
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
