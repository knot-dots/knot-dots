import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { type Fixtures, test } from '$lib/fixtures';
import {
	type AnyPayload,
	modifiedContainer,
	newContainer,
	type PartialRelation,
	type PayloadType,
	payloadTypes,
	predicates,
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

test('containers can be related to each other', async ({ connection }: Fixtures) => {
	const expectedRelations: Relation[] = [];

	const program = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.program
			},
			[]
		)
	)(connection);

	const partOfProgramTypes = [payloadTypes.enum.goal, payloadTypes.enum.measure];

	for (const payloadType of partOfProgramTypes) {
		const i = partOfProgramTypes.indexOf(payloadType);
		const partOfProgram = await createContainer(
			initializeNewContainer({ title: 'Lorem ipsum', type: payloadType }, [
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
			},
			[]
		)
	)(connection);

	const partOfProgramTypes = [payloadTypes.enum.goal, payloadTypes.enum.measure];

	for (const payloadType of partOfProgramTypes) {
		const i = partOfProgramTypes.indexOf(payloadType);
		const partOfProgram = await createContainer(
			initializeNewContainer({ title: 'Lorem ipsum', type: payloadType }, [
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
			},
			[]
		)
	)(connection);

	const partOfProgramTypes = [payloadTypes.enum.goal, payloadTypes.enum.measure];

	for (const payloadType of partOfProgramTypes) {
		const i = partOfProgramTypes.indexOf(payloadType);
		const partOfProgram = await createContainer(
			initializeNewContainer({ title: 'Lorem ipsum', type: payloadType }, [
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
		initializeNewContainer({ title: 'Lorem ipsum', type: payloadTypes.enum.measure }, [])
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
			},
			[]
		)
	)(connection);

	const partOfProgramTypes = [payloadTypes.enum.goal, payloadTypes.enum.measure];

	for (const payloadType of partOfProgramTypes) {
		const i = partOfProgramTypes.indexOf(payloadType);
		const partOfProgram = await createContainer(
			initializeNewContainer({ title: 'Lorem ipsum', type: payloadType }, [
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
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.task
			},
			[
				{
					object: expectedRelationsOfProgram[2].subject,
					position: 0,
					predicate: predicates.enum['is-part-of']
				}
			]
		)
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

test('getManyContainers and getManyContainersWithES return the same results', async ({
	connection
}: Fixtures) => {
	// Get the organization GUID for Musterhausen
	const org = await connection.one(sql.typeAlias('guid')`
		SELECT guid FROM container 
		WHERE payload->>'name' = 'Musterhausen' 
		AND payload->>'type' = 'organization'
		LIMIT 1
	`);

	let filters = { type: [payloadTypes.enum.goal], categories: [] as string[] };

	// Query with both functions using the same parameters, filtering for goals only
	const sqlResults = await getManyContainers([org.guid], filters, 'title', 1000)(connection);

	const esResults = await getManyContainersWithES([org.guid], filters, 'title', 1000)(connection);

	// Both should return the same number of containers
	expect(esResults.length).toBe(sqlResults.length);

	// Extract GUIDs and verify they match
	const sqlGuids = sqlResults.map((c) => c.guid).sort();
	const esGuids = esResults.map((c) => c.guid).sort();

	expect(esGuids).toEqual(sqlGuids);
});
