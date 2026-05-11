import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { type Fixtures, test } from '$lib/fixtures';
import {
	type AnyPayload,
	type MeasureContainer,
	modifiedContainer,
	type NewContainer,
	newContainer,
	type PartialRelation,
	type PayloadType,
	payloadTypes,
	predicates,
	type ProgramContainer,
	type Relation
} from '$lib/models';
import {
	createContainer,
	getContainerByGuid,
	getManyContainers,
	sql,
	updateContainer,
	updateManyContainerRelations
} from '$lib/server/db';
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
			} as NewContainer & ProgramContainer['payload'],
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
			} as NewContainer & ProgramContainer['payload'],
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
			} as NewContainer & ProgramContainer['payload'],
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
			{ title: 'Lorem ipsum', type: payloadTypes.enum.measure } as NewContainer &
				MeasureContainer['payload'],
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
			} as NewContainer & ProgramContainer['payload'],
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
				object: expectedRelationsOfProgram[2].subject,
				position: 0,
				predicate: predicates.enum['is-part-of']
			}
		])
	)(connection);
	expect(task.relation).toEqual([
		{
			object: expectedRelationsOfProgram[2].subject,
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

test.for([
	{
		name: 'all',
		filters: {
			terms: 'nachhaltig',
			type: [
				payloadTypes.enum.effect,
				payloadTypes.enum.goal,
				payloadTypes.enum.indicator_template,
				payloadTypes.enum.measure,
				payloadTypes.enum.program,
				payloadTypes.enum.rule,
				payloadTypes.enum.simple_measure
			]
		},
		sort: 'alpha'
	},
	{
		name: 'öffentlich',
		filters: {
			terms: 'nachhalt',
			type: [
				payloadTypes.enum.effect,
				payloadTypes.enum.goal,
				payloadTypes.enum.indicator_template,
				payloadTypes.enum.measure,
				payloadTypes.enum.program,
				payloadTypes.enum.rule,
				payloadTypes.enum.simple_measure
			]
		},
		sort: 'alpha'
	},
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
