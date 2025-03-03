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
	updateContainer,
	updateManyContainerRelations
} from '$lib/server/db';

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

	const strategy = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.strategy
			},
			[]
		)
	)(connection);

	const partOfStrategyTypes: PayloadType[] = [
		payloadTypes.enum.vision,
		payloadTypes.enum.strategic_goal,
		payloadTypes.enum.operational_goal,
		payloadTypes.enum.measure
	];

	for (const payloadType of partOfStrategyTypes) {
		const i = partOfStrategyTypes.indexOf(payloadType);
		const partOfStrategy = await createContainer(
			initializeNewContainer({ title: 'Lorem ipsum', type: payloadType }, [
				{
					object: strategy.guid,
					position: i,
					predicate: predicates.enum['is-part-of-strategy']
				}
			])
		)(connection);
		expectedRelations.push(...partOfStrategy.relation);
	}

	const strategyWithRelations = await getContainerByGuid(strategy.guid)(connection);
	expect(strategyWithRelations.relation).toEqual(expectedRelations);
});

test('relation positions can be updated', async ({ connection }: Fixtures) => {
	const expectedRelationsOfStrategy: Relation[] = [];

	const strategy = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.strategy
			},
			[]
		)
	)(connection);

	const partOfStrategyTypes: PayloadType[] = [
		payloadTypes.enum.vision,
		payloadTypes.enum.strategic_goal,
		payloadTypes.enum.operational_goal,
		payloadTypes.enum.measure
	];

	for (const payloadType of partOfStrategyTypes) {
		const i = partOfStrategyTypes.indexOf(payloadType);
		const partOfStrategy = await createContainer(
			initializeNewContainer({ title: 'Lorem ipsum', type: payloadType }, [
				{
					object: strategy.guid,
					position: i,
					predicate: predicates.enum['is-part-of-strategy']
				}
			])
		)(connection);
		expectedRelationsOfStrategy.push(...partOfStrategy.relation);
	}

	const strategyWithRelations = await getContainerByGuid(strategy.guid)(connection);
	expect(strategyWithRelations.relation).toEqual(expectedRelationsOfStrategy);

	await updateManyContainerRelations(
		[...strategyWithRelations.relation.slice(1), strategyWithRelations.relation[0]].map(
			(r, index) => ({ ...r, position: index })
		)
	)(connection);

	const strategyWithModifiedRelations = await getContainerByGuid(strategy.guid)(connection);
	expect(strategyWithModifiedRelations.relation).toEqual(
		[...expectedRelationsOfStrategy.slice(1), expectedRelationsOfStrategy[0]].map((r, index) => ({
			...r,
			position: index
		}))
	);
});

test('relations are added or removed when updating a container', async ({
	connection
}: Fixtures) => {
	const expectedRelationsOfStrategy: Relation[] = [];

	const strategy = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.strategy
			},
			[]
		)
	)(connection);

	const partOfStrategyTypes: PayloadType[] = [
		payloadTypes.enum.vision,
		payloadTypes.enum.strategic_goal,
		payloadTypes.enum.operational_goal,
		payloadTypes.enum.measure
	];

	for (const payloadType of partOfStrategyTypes) {
		const i = partOfStrategyTypes.indexOf(payloadType);
		const partOfStrategy = await createContainer(
			initializeNewContainer({ title: 'Lorem ipsum', type: payloadType }, [
				{
					object: strategy.guid,
					position: i,
					predicate: predicates.enum['is-part-of-strategy']
				}
			])
		)(connection);
		expectedRelationsOfStrategy.push(...partOfStrategy.relation);
	}

	const strategyWithRelations = await getContainerByGuid(strategy.guid)(connection);
	expect(strategyWithRelations.relation).toEqual(expectedRelationsOfStrategy);

	const anotherContainer = await createContainer(
		initializeNewContainer({ title: 'Lorem ipsum', type: payloadTypes.enum.measure }, [])
	)(connection);

	const newRelation = {
		object: strategy.guid,
		position: 0,
		predicate: predicates.enum['is-part-of-strategy'],
		subject: anotherContainer.guid
	};

	await updateContainer(
		modifiedContainer.parse({
			...strategyWithRelations,
			relation: [newRelation, ...strategyWithRelations.relation.slice(1)]
		})
	)(connection);

	const strategyWithModifiedRelations = await getContainerByGuid(strategy.guid)(connection);
	expect(strategyWithModifiedRelations.relation).toEqual([
		newRelation,
		...expectedRelationsOfStrategy.slice(1)
	]);

	const anotherContainerWitRelations = await getContainerByGuid(anotherContainer.guid)(connection);
	expect(anotherContainerWitRelations.relation).toEqual([newRelation]);

	const formerFirstPartOfStrategy = await getContainerByGuid(
		expectedRelationsOfStrategy[0].subject
	)(connection);
	expect(formerFirstPartOfStrategy.relation).toEqual([]);
});

test('adding more relations does not interfere with existing relations', async ({
	connection
}: Fixtures) => {
	const expectedRelationsOfStrategy: Relation[] = [];

	const strategy = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.strategy
			},
			[]
		)
	)(connection);

	const partOfStrategyTypes: PayloadType[] = [
		payloadTypes.enum.vision,
		payloadTypes.enum.strategic_goal,
		payloadTypes.enum.operational_goal,
		payloadTypes.enum.measure
	];

	for (const payloadType of partOfStrategyTypes) {
		const i = partOfStrategyTypes.indexOf(payloadType);
		const partOfStrategy = await createContainer(
			initializeNewContainer({ title: 'Lorem ipsum', type: payloadType }, [
				{
					object: strategy.guid,
					position: i,
					predicate: predicates.enum['is-part-of-strategy']
				}
			])
		)(connection);
		expectedRelationsOfStrategy.push(...partOfStrategy.relation);
	}

	const task = await createContainer(
		initializeNewContainer(
			{
				title: 'Lorem ipsum',
				type: payloadTypes.enum.task
			},
			[
				{
					object: expectedRelationsOfStrategy[2].subject,
					position: 0,
					predicate: predicates.enum['is-part-of']
				}
			]
		)
	)(connection);
	expect(task.relation).toEqual([
		{
			object: expectedRelationsOfStrategy[2].subject,
			position: 0,
			predicate: predicates.enum['is-part-of'],
			subject: task.guid
		}
	]);

	const strategyWithRelations = await getContainerByGuid(strategy.guid)(connection);
	expect(strategyWithRelations.relation).toEqual(expectedRelationsOfStrategy);
});
