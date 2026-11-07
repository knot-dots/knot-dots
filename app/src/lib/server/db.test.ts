import { v4 as uuid } from 'uuid';
import { expect } from 'vitest';
import { z } from 'zod';
import {
	test as base,
	type ContainerFixtureOptions,
	type Fixtures,
	type PayloadFixture,
	realm
} from '$lib/fixtures';
import {
	type AnyPayload,
	type Container,
	grantSetForRole,
	memberRoles,
	modifiedContainer,
	newContainer,
	type OrganizationalUnitPayload,
	type PartialRelation,
	type PayloadType,
	payloadTypes,
	predicates,
	resourceDataTypes,
	type Relation,
	visibility
} from '$lib/models';
import {
	changeManyContainerRelations,
	ContainerRestoreError,
	ContainerRevisionConflictError,
	createContainer,
	createOrUpdateUser,
	deleteContainer,
	deleteContainerRecursively,
	deleteOrganizationalUnitContainer,
	getAdoptedContainerGuids,
	getAllContainersRelatedToProgram,
	getAllGrantsOfUserFromMemberRoles,
	getContainerCopyGraph,
	getContainerByGuid,
	getIndicatorGuidsInUse,
	getManyContainers,
	getManyOrganizationalUnitContainers,
	restoreContainerRecursively,
	sql,
	updateContainer,
	updateManyContainerRelations
} from '$lib/server/db';
import { computeManagedBy } from '$lib/server/computeManagedBy';
import { computeUserGrants } from '$lib/server/computeUserGrants';
import { getManyContainersWithES } from '$lib/server/elasticsearch';

const test = base
	.extend('programWithParts', async ({ containers, relations }) => {
		const program = containers.add({ type: payloadTypes.enum.program });
		const goal = containers.add({ type: payloadTypes.enum.goal });
		const measure = containers.add({ type: payloadTypes.enum.measure });
		const relationsOfProgram = [
			relations.add(goal, predicates.enum['is-part-of-program'], program),
			relations.add(measure, predicates.enum['is-part-of-program'], program)
		];
		await containers.persist();
		await relations.persist();
		return { goal, measure, program, relationsOfProgram };
	})
	.extend('programPair', async ({ containers, relations }) => {
		const firstProgram = containers.add({
			title: 'First program',
			type: payloadTypes.enum.program
		});
		const secondProgram = containers.add({
			title: 'Second program',
			type: payloadTypes.enum.program
		});
		const sharedGoal = containers.add({ type: payloadTypes.enum.goal });
		const childOfShared = containers.add({ type: payloadTypes.enum.measure });
		relations.add(sharedGoal, predicates.enum['is-part-of-program'], firstProgram);
		relations.add(sharedGoal, predicates.enum['is-part-of-program'], secondProgram);
		relations.add(childOfShared, predicates.enum['is-part-of'], sharedGoal);
		relations.add(childOfShared, predicates.enum['is-part-of-program'], firstProgram);
		await containers.persist();
		await relations.persist();
		return { childOfShared, firstProgram, secondProgram, sharedGoal };
	});

// For the containers created with createContainer() rather than as fixtures: in the
// tests of createContainer() itself, which assigns the GUID and completes the
// relations, and where createManyContainers() does not write a column, e.g. own_matrix.
function newContainerInput(
	organization: string,
	payload: PayloadFixture,
	relation: PartialRelation[]
) {
	return newContainer.parse({
		managed_by: organization,
		organization,
		organizational_unit: null,
		payload: { title: 'Lorem ipsum', ...payload },
		realm,
		relation
	});
}

async function createTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

const team = (...members: string[]) =>
	members.map((subject) => ({ predicate: predicates.enum['is-member-of'], subject }));

const organization = uuid();

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

test('containers can be related to each other', async ({
	connection,
	containers,
	organization
}) => {
	const program = containers.add({ type: payloadTypes.enum.program });
	await containers.persist();

	const parts = [];
	for (const type of [payloadTypes.enum.goal, payloadTypes.enum.measure]) {
		parts.push(
			await createContainer(
				newContainerInput(organization, { type }, [
					{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
				])
			)(connection)
		);
	}

	const programWithRelations = await getContainerByGuid(program.guid)(connection);
	expect.assert.sameDeepMembers(
		programWithRelations.relation,
		parts.flatMap(({ relation }) => relation)
	);
});

test('template queries separate organization and program availability', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const programA = containers.add({ title: 'Program A', type: payloadTypes.enum.program });
	const programB = containers.add({ title: 'Program B', type: payloadTypes.enum.program });
	const globalTemplate = containers.add({
		template: true,
		title: 'Global template',
		type: payloadTypes.enum.report
	});
	const programATemplate = containers.add({
		template: true,
		title: 'Program A template',
		type: payloadTypes.enum.report
	});
	const programBTemplate = containers.add({
		template: true,
		title: 'Program B template',
		type: payloadTypes.enum.report
	});
	relations.add(programATemplate, predicates.enum['is-available-in'], programA);
	relations.add(programBTemplate, predicates.enum['is-available-in'], programB);
	await containers.persist();
	await relations.persist();

	const organizationTemplates = await getManyContainers(
		[organization],
		{ template: true, type: [payloadTypes.enum.report] },
		'alpha'
	)(connection);
	const programTemplates = await getManyContainers(
		[organization],
		{ availableIn: programA.guid, template: true, type: [payloadTypes.enum.report] },
		'alpha'
	)(connection);

	expect(organizationTemplates.map(({ guid }) => guid)).toEqual([globalTemplate.guid]);
	expect(programTemplates.map(({ guid }) => guid)).toEqual([programATemplate.guid]);
});

for (const type of ['program', 'measure', 'simple_measure'] as const) {
	test(`deleting a ${type} deletes exclusively scoped templates`, async ({
		connection,
		containers,
		organization,
		relations
	}) => {
		const deletedScope = containers.add({ title: 'Deleted scope', type });
		const remainingProgram = containers.add({
			title: 'Remaining program',
			type: payloadTypes.enum.program
		});
		const exclusiveTemplate = containers.add({
			template: true,
			title: 'Exclusive template',
			type: payloadTypes.enum.report
		});
		const sharedTemplate = containers.add({
			template: true,
			title: 'Shared template',
			type: payloadTypes.enum.report
		});
		relations.add(exclusiveTemplate, predicates.enum['is-available-in'], deletedScope);
		relations.add(sharedTemplate, predicates.enum['is-available-in'], deletedScope);
		relations.add(sharedTemplate, predicates.enum['is-available-in'], remainingProgram);
		await containers.persist();
		await relations.persist();

		await deleteContainer(await getContainerByGuid(deletedScope.guid)(connection))(connection);

		const remainingTemplates = await getManyContainers(
			[organization],
			{
				availableIn: remainingProgram.guid,
				template: true,
				type: [payloadTypes.enum.report]
			},
			'alpha'
		)(connection);
		const organizationTemplates = await getManyContainers(
			[organization],
			{ template: true, type: [payloadTypes.enum.report] },
			'alpha'
		)(connection);

		expect(remainingTemplates.map(({ guid }) => guid)).toEqual([sharedTemplate.guid]);
		expect(organizationTemplates.map(({ guid }) => guid)).not.toContain(exclusiveTemplate.guid);
		expect(organizationTemplates.map(({ guid }) => guid)).not.toContain(sharedTemplate.guid);
	});
}

test('nested measure template scopes are discovered when copying a program', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ title: 'Program', type: payloadTypes.enum.program });
	const measure = containers.add({ title: 'Measure', type: payloadTypes.enum.measure });
	const nested = containers.add({
		template: true,
		title: 'Nested',
		type: payloadTypes.enum.measure
	});
	const goal = containers.add({ template: true, title: 'Goal', type: payloadTypes.enum.goal });
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	relations.add(nested, predicates.enum['is-available-in'], measure);
	relations.add(goal, predicates.enum['is-available-in'], nested);
	await containers.persist();
	await relations.persist();

	const result = await getContainerCopyGraph(program.guid)(connection);
	expect(result.containers.map(({ guid }) => guid)).toEqual(
		expect.arrayContaining([program.guid, measure.guid, nested.guid, goal.guid])
	);
	const measureResult = await getContainerCopyGraph(measure.guid)(connection);
	expect(measureResult.containers.map(({ guid }) => guid)).toEqual(
		expect.arrayContaining([measure.guid, nested.guid, goal.guid])
	);
	await deleteContainer(await getContainerByGuid(measure.guid)(connection))(connection);
	expect(
		await getManyContainers(
			[],
			{ guid: [measure.guid, nested.guid, goal.guid] },
			'alpha'
		)(connection)
	).toEqual([]);
});

test('relation positions can be updated', async ({ connection, containers, relations }) => {
	const program = containers.add({ type: payloadTypes.enum.program });
	const goal = containers.add({ type: payloadTypes.enum.goal });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	const sections = [
		relations.add(goal, predicates.enum['is-section-of'], program),
		relations.add(measure, predicates.enum['is-section-of'], program)
	];
	await containers.persist();
	await relations.persist();

	const programWithRelations = await getContainerByGuid(program.guid)(connection);
	expect.assert.sameDeepMembers(programWithRelations.relation, sections);

	const reordered = [
		...programWithRelations.relation.slice(1),
		programWithRelations.relation[0]
	].map((r, index) => ({ ...r, position: index }));
	await updateManyContainerRelations(reordered)(connection);

	const programWithModifiedRelations = await getContainerByGuid(program.guid)(connection);
	expect(programWithModifiedRelations.relation).toEqual(reordered);
});

test('relation changes commit together with afterChange or not at all', async ({
	connection,
	containers
}) => {
	const subject = containers.add({ type: payloadTypes.enum.goal });
	const object = containers.add({ type: payloadTypes.enum.goal });
	await containers.persist();
	const relationWith = (predicate: string): Relation => ({
		object: object.guid,
		position: 0,
		predicate,
		subject: subject.guid
	});
	const consistent = relationWith(predicates.enum['is-consistent-with']);
	const contributing = relationWith(predicates.enum['contributes-to']);
	const relationsOfSubject = async () =>
		(await getContainerByGuid(subject.guid)(connection)).relation;

	await changeManyContainerRelations({ removed: [], upserted: [consistent] })(connection);
	expect(await relationsOfSubject()).toEqual([consistent]);

	let changedIn: unknown;
	await changeManyContainerRelations(
		{ removed: [consistent], upserted: [contributing] },
		{
			afterChange: async (txConnection) => {
				changedIn = txConnection;
			}
		}
	)(connection);
	expect(changedIn).toBeDefined();
	expect(await relationsOfSubject()).toEqual([contributing]);

	await expect(
		changeManyContainerRelations(
			{ removed: [contributing], upserted: [consistent] },
			{
				afterChange: async () => {
					throw new Error('afterChange failed');
				}
			}
		)(connection)
	).rejects.toThrow('afterChange failed');
	expect(await relationsOfSubject()).toEqual([contributing]);

	// a relation removed before can be added again
	await changeManyContainerRelations({ removed: [], upserted: [consistent] })(connection);
	expect(await relationsOfSubject()).toEqual([contributing, consistent]);
});

test('relations are added or removed when updating a container', async ({
	connection,
	containers,
	programWithParts
}) => {
	const { program, relationsOfProgram } = programWithParts;
	const anotherMeasure = containers.add({ type: payloadTypes.enum.measure });
	await containers.persist();

	const programWithRelations = await getContainerByGuid(program.guid)(connection);
	expect.assert.sameDeepMembers(programWithRelations.relation, relationsOfProgram);

	const [replacedRelation, ...keptRelations] = programWithRelations.relation;
	const newRelation = {
		object: program.guid,
		position: 0,
		predicate: predicates.enum['is-part-of-program'],
		subject: anotherMeasure.guid
	};

	await updateContainer(
		modifiedContainer.parse({
			...programWithRelations,
			relation: [newRelation, ...keptRelations]
		})
	)(connection);

	const programWithModifiedRelations = await getContainerByGuid(program.guid)(connection);
	expect.assert.sameDeepMembers(programWithModifiedRelations.relation, [
		newRelation,
		...keptRelations
	]);

	const anotherMeasureWithRelations = await getContainerByGuid(anotherMeasure.guid)(connection);
	expect(anotherMeasureWithRelations.relation).toEqual([newRelation]);

	const formerPartOfProgram = await getContainerByGuid(replacedRelation.subject)(connection);
	expect(formerPartOfProgram.relation).toEqual([]);
});

test('adding more relations does not interfere with existing relations', async ({
	connection,
	organization,
	programWithParts
}) => {
	const { measure, program, relationsOfProgram } = programWithParts;

	const task = await createContainer(
		newContainerInput(organization, { type: payloadTypes.enum.task }, [
			{ object: measure.guid, position: 0, predicate: predicates.enum['is-part-of'] }
		])
	)(connection);
	expect.assert.sameDeepMembers(task.relation, [
		{
			object: measure.guid,
			position: 0,
			predicate: predicates.enum['is-part-of'],
			subject: task.guid
		}
	]);

	const programWithRelations = await getContainerByGuid(program.guid)(connection);
	expect.assert.sameDeepMembers(programWithRelations.relation, relationsOfProgram);
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
		filters: { type: [payloadTypes.enum.indicator] },
		sort: 'modified'
	},
	{
		name: 'indicator with topics',
		filters: {
			type: [payloadTypes.enum.indicator],
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
	connection,
	containers,
	relations
}) => {
	const firstProgram = containers.add({ type: payloadTypes.enum.program });
	const secondProgram = containers.add({ type: payloadTypes.enum.program });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of-program'], firstProgram);
	relations.add(measure, predicates.enum['is-part-of-program'], secondProgram);
	await containers.persist();
	await relations.persist();

	const relatedToFirst = await getAllContainersRelatedToProgram(firstProgram.guid, {})(connection);
	const relatedToSecond = await getAllContainersRelatedToProgram(
		secondProgram.guid,
		{}
	)(connection);
	expect(relatedToFirst.map(({ guid }) => guid)).toContain(measure.guid);
	expect(relatedToSecond.map(({ guid }) => guid)).toContain(measure.guid);
});

test('deleting a program keeps members of other programs together with their children', async ({
	connection,
	containers,
	relations
}) => {
	const deletedProgram = containers.add({
		title: 'Deleted program',
		type: payloadTypes.enum.program
	});
	const remainingProgram = containers.add({
		title: 'Remaining program',
		type: payloadTypes.enum.program
	});
	const sharedGoal = containers.add({ type: payloadTypes.enum.goal });
	const exclusiveGoal = containers.add({ type: payloadTypes.enum.goal });
	const exclusiveMeasure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(sharedGoal, predicates.enum['is-part-of-program'], deletedProgram);
	relations.add(sharedGoal, predicates.enum['is-part-of-program'], remainingProgram);
	relations.add(exclusiveGoal, predicates.enum['is-part-of-program'], deletedProgram);
	relations.add(exclusiveMeasure, predicates.enum['is-part-of'], sharedGoal);
	relations.add(exclusiveMeasure, predicates.enum['is-part-of-program'], deletedProgram);
	await containers.persist();
	await relations.persist();

	await deleteContainerRecursively(await getContainerByGuid(deletedProgram.guid)(connection))(
		connection
	);

	await expect(getContainerByGuid(exclusiveGoal.guid)(connection)).rejects.toThrow();

	const persistedExclusiveMeasure = await getContainerByGuid(exclusiveMeasure.guid)(connection);
	expect(persistedExclusiveMeasure.relation.map(({ predicate }) => predicate)).toEqual([
		predicates.enum['is-part-of']
	]);

	const persistedSharedGoal = await getContainerByGuid(sharedGoal.guid)(connection);
	expect(
		persistedSharedGoal.relation
			.filter(({ predicate }) => predicate === predicates.enum['is-part-of-program'])
			.map(({ object }) => object)
	).toEqual([remainingProgram.guid]);
});

test('deleting a shared goal itself takes its children along and leaves both programs', async ({
	connection,
	programPair
}) => {
	const { childOfShared, firstProgram, secondProgram, sharedGoal } = programPair;

	await deleteContainerRecursively(await getContainerByGuid(sharedGoal.guid)(connection))(
		connection
	);

	await expect(getContainerByGuid(sharedGoal.guid)(connection)).rejects.toThrow();
	await expect(getContainerByGuid(childOfShared.guid)(connection)).rejects.toThrow();
	for (const program of [firstProgram, secondProgram]) {
		const members = await getAllContainersRelatedToProgram(program.guid, {})(connection);
		expect(members.map(({ guid }) => guid)).not.toContain(sharedGoal.guid);
	}
});

test('deleting both programs one after the other removes the shared goal with the last one', async ({
	connection,
	programPair
}) => {
	const { childOfShared, firstProgram, secondProgram, sharedGoal } = programPair;

	await deleteContainerRecursively(await getContainerByGuid(firstProgram.guid)(connection))(
		connection
	);
	await expect(getContainerByGuid(sharedGoal.guid)(connection)).resolves.toBeDefined();
	await expect(getContainerByGuid(childOfShared.guid)(connection)).resolves.toBeDefined();

	await deleteContainerRecursively(await getContainerByGuid(secondProgram.guid)(connection))(
		connection
	);
	await expect(getContainerByGuid(sharedGoal.guid)(connection)).rejects.toThrow();
	await expect(getContainerByGuid(childOfShared.guid)(connection)).rejects.toThrow();
});

test('a measure in two programs survives one program but not its own goal', async ({
	connection,
	containers,
	programPair,
	relations
}) => {
	const { firstProgram, secondProgram } = programPair;
	const goal = containers.add({ type: payloadTypes.enum.goal });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(goal, predicates.enum['is-part-of-program'], firstProgram);
	relations.add(measure, predicates.enum['is-part-of'], goal);
	relations.add(measure, predicates.enum['is-part-of-program'], firstProgram);
	relations.add(measure, predicates.enum['is-part-of-program'], secondProgram);
	await containers.persist();
	await relations.persist();

	await deleteContainerRecursively(await getContainerByGuid(firstProgram.guid)(connection))(
		connection
	);
	await expect(getContainerByGuid(goal.guid)(connection)).rejects.toThrow();
	const survivingMeasure = await getContainerByGuid(measure.guid)(connection);
	expect(survivingMeasure.relation.map(({ object, predicate }) => [predicate, object])).toEqual([
		[predicates.enum['is-part-of-program'], secondProgram.guid]
	]);

	const otherGoal = containers.add({ type: payloadTypes.enum.goal });
	relations.add(otherGoal, predicates.enum['is-part-of-program'], secondProgram);
	await containers.persist();
	await relations.persist();

	await updateContainer(
		modifiedContainer.parse({
			...survivingMeasure,
			relation: [
				...survivingMeasure.relation,
				{
					object: otherGoal.guid,
					position: 0,
					predicate: predicates.enum['is-part-of'],
					subject: measure.guid
				}
			]
		})
	)(connection);
	await deleteContainerRecursively(await getContainerByGuid(otherGoal.guid)(connection))(
		connection
	);
	await expect(getContainerByGuid(measure.guid)(connection)).rejects.toThrow();
});

// The revision history of a container as [deleted, valid_currently] per row,
// oldest first. The read API hides the deleted revisions, so restore tests
// look at the rows themselves.
function revisionHistory(connection: Fixtures['connection'], guid: string) {
	return connection.any(sql.type(z.object({ deleted: z.boolean(), valid_currently: z.boolean() }))`
		SELECT deleted, valid_currently
		FROM container
		WHERE guid = ${guid}
		ORDER BY revision
	`);
}

test('restoring a deleted container adds a revision equal to the one before the deletion', async ({
	connection,
	containers
}) => {
	const member = await createTestUser(connection);
	const deleter = await createTestUser(connection);
	const goal = containers.add({ type: payloadTypes.enum.goal }, { user: team(member) });
	await containers.persist();
	const before = await getContainerByGuid(goal.guid)(connection);

	await deleteContainer({
		...before,
		user: [{ predicate: predicates.enum['is-creator-of'], subject: deleter }]
	})(connection);
	await expect(getContainerByGuid(goal.guid)(connection)).rejects.toThrow();

	const restored = await restoreContainerRecursively(goal.guid)(connection);

	expect(restored.revision).toBeGreaterThan(before.revision);
	expect(restored).toEqual({
		...before,
		revision: restored.revision,
		valid_from: restored.valid_from
	});
	expect(await getContainerByGuid(goal.guid)(connection)).toEqual(restored);
	expect(await revisionHistory(connection, goal.guid)).toEqual([
		{ deleted: false, valid_currently: false },
		{ deleted: true, valid_currently: false },
		{ deleted: false, valid_currently: true }
	]);
});

// The rows of one relation as [deleted, valid_currently]. Relations carry no
// revision number and a test runs in one transaction, so the rows are ordered
// by their flags rather than by age.
function relationHistory(connection: Fixtures['connection'], relation: Omit<Relation, 'position'>) {
	return connection.any(sql.type(z.object({ deleted: z.boolean(), valid_currently: z.boolean() }))`
		SELECT deleted, valid_currently
		FROM container_relation
		WHERE object = ${relation.object}
			AND predicate = ${relation.predicate}
			AND subject = ${relation.subject}
		ORDER BY deleted, valid_currently
	`);
}

test('restoring a deleted container restores the relations deleted along with it', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ title: 'Program', type: payloadTypes.enum.program });
	const goal = containers.add({ type: payloadTypes.enum.goal });
	relations.add(goal, predicates.enum['is-part-of-program'], program);
	relations.add(goal, predicates.enum['is-section-of'], program, 3);
	await containers.persist();
	await relations.persist();
	const before = await getContainerByGuid(goal.guid)(connection);

	await deleteContainerRecursively(before)(connection);
	expect((await getContainerByGuid(program.guid)(connection)).relation).toEqual([]);

	const restored = await restoreContainerRecursively(goal.guid)(connection);

	expect(restored.relation).toEqual(before.relation);
	expect((await getContainerByGuid(program.guid)(connection)).relation).toEqual(before.relation);
	expect(await relationHistory(connection, before.relation[0])).toEqual([
		{ deleted: false, valid_currently: false },
		{ deleted: false, valid_currently: true },
		{ deleted: true, valid_currently: false }
	]);
});

// A test runs in one transaction, where every row shares the same valid_from.
// Moving the deleted rows of a container back in time simulates that they
// were deleted in an earlier transaction.
async function backdateDeletion(connection: Fixtures['connection'], guid: string) {
	await connection.query(sql.typeAlias('void')`
		UPDATE container_relation
		SET valid_from = valid_from - interval '1 hour'
		WHERE (subject = ${guid} OR object = ${guid})
			AND deleted
			AND valid_currently
	`);
	await connection.query(sql.typeAlias('void')`
		UPDATE container
		SET valid_from = valid_from - interval '1 hour'
		WHERE guid = ${guid}
			AND deleted
			AND valid_currently
	`);
}

test('restoring leaves a relation alone that was removed before the deletion', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ title: 'Program', type: payloadTypes.enum.program });
	const goal = containers.add({ type: payloadTypes.enum.goal });
	relations.add(goal, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	const detached = await updateContainer(
		modifiedContainer.parse({ ...(await getContainerByGuid(goal.guid)(connection)), relation: [] })
	)(connection);
	await backdateDeletion(connection, goal.guid);

	await deleteContainerRecursively(detached)(connection);
	const restored = await restoreContainerRecursively(goal.guid)(connection);

	expect(restored.relation).toEqual([]);
	expect((await getContainerByGuid(program.guid)(connection)).relation).toEqual([]);
});

test('restoring skips relations to containers that are still deleted until those come back', async ({
	connection,
	containers,
	relations
}) => {
	const goal = containers.add({ type: payloadTypes.enum.goal });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(measure, predicates.enum['is-part-of'], goal);
	await containers.persist();
	await relations.persist();
	const measureBefore = await getContainerByGuid(measure.guid)(connection);

	await deleteContainerRecursively(await getContainerByGuid(goal.guid)(connection))(connection);

	const restoredMeasure = await restoreContainerRecursively(measure.guid)(connection);
	expect(restoredMeasure.relation).toEqual([]);

	const restoredGoal = await restoreContainerRecursively(goal.guid)(connection);
	expect(restoredGoal.relation).toEqual(measureBefore.relation);
	expect((await getContainerByGuid(measure.guid)(connection)).relation).toEqual(
		measureBefore.relation
	);
});

test('restoring fails when there is no deleted container to restore', async ({
	connection,
	containers
}) => {
	const goal = containers.add({ type: payloadTypes.enum.goal });
	await containers.persist();

	await expect(restoreContainerRecursively(goal.guid)(connection)).rejects.toThrow(
		ContainerRestoreError
	);
	await expect(restoreContainerRecursively(goal.guid)(connection)).rejects.toMatchObject({
		kind: 'not_found'
	});
	await expect(restoreContainerRecursively(uuid())(connection)).rejects.toMatchObject({
		kind: 'not_found'
	});
	expect(await revisionHistory(connection, goal.guid)).toEqual([
		{ deleted: false, valid_currently: true }
	]);
});

test('restoring an organization is refused because its Keycloak group is gone', async ({
	connection
}: Fixtures) => {
	const guid = uuid();
	for (const deleted of [false, true]) {
		await connection.query(sql.typeAlias('void')`
			INSERT INTO container (deleted, guid, managed_by, organization, payload, realm, valid_currently)
			VALUES (
				${deleted},
				${guid},
				${guid},
				${guid},
				${sql.jsonb({ name: 'Organization', type: payloadTypes.enum.organization })},
				${realm},
				${deleted}
			)
		`);
	}

	await expect(restoreContainerRecursively(guid)(connection)).rejects.toMatchObject({
		kind: 'unsupported'
	});
	expect(await revisionHistory(connection, guid)).toEqual([
		{ deleted: false, valid_currently: false },
		{ deleted: true, valid_currently: true }
	]);
});

test('the restored revision keeps the own matrix and the grants derived from the member roles', async ({
	connection,
	organization
}) => {
	const member = await createTestUser(connection);
	// createManyContainers() does not write own_matrix, so the program is no fixture.
	const program = await createContainer({
		...newContainerInput(organization, { type: payloadTypes.enum.program }, []),
		own_matrix: true,
		user: team(member)
	})(connection);
	const before = await getContainerByGuid(program.guid)(connection);
	const grantsBefore = await computeUserGrants(connection, member, [program.guid]);
	expect(grantsBefore.get(program.guid)?.scope_sourced).toBe(false);

	await deleteContainerRecursively(before)(connection);
	const restored = await restoreContainerRecursively(program.guid)(connection);

	expect(restored.own_matrix).toBe(true);
	expect(await computeUserGrants(connection, member, [program.guid])).toEqual(grantsBefore);
});

async function snapshot(connection: Fixtures['connection'], guids: string[]) {
	return new Map(
		await Promise.all(
			guids.map(async (guid) => [guid, await getContainerByGuid(guid)(connection)] as const)
		)
	);
}

async function expectRestored(
	connection: Fixtures['connection'],
	before: Map<string, Container<AnyPayload>>
) {
	for (const [guid, original] of before) {
		const restored = await getContainerByGuid(guid)(connection);
		expect(restored).toEqual({
			...original,
			revision: restored.revision,
			valid_from: restored.valid_from
		});
		expect(await revisionHistory(connection, guid)).toEqual([
			{ deleted: false, valid_currently: false },
			{ deleted: true, valid_currently: false },
			{ deleted: false, valid_currently: true }
		]);
	}
}

test('restoring a program brings back the objects deleted along with it', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ title: 'Program', type: payloadTypes.enum.program });
	const goal = containers.add({ type: payloadTypes.enum.goal });
	const measure = containers.add({ type: payloadTypes.enum.measure });
	relations.add(goal, predicates.enum['is-part-of-program'], program);
	relations.add(measure, predicates.enum['is-part-of'], goal);
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();
	const before = await snapshot(connection, [program.guid, goal.guid, measure.guid]);

	await deleteContainerRecursively(before.get(program.guid)!)(connection);
	for (const guid of before.keys()) {
		await expect(getContainerByGuid(guid)(connection)).rejects.toThrow();
	}

	await restoreContainerRecursively(program.guid)(connection);

	await expectRestored(connection, before);
});

test('restoring a program leaves a goal deleted that was deleted on its own before', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({ title: 'Program', type: payloadTypes.enum.program });
	const earlierGoal = containers.add({ type: payloadTypes.enum.goal });
	const goal = containers.add({ type: payloadTypes.enum.goal });
	relations.add(earlierGoal, predicates.enum['is-part-of-program'], program);
	relations.add(goal, predicates.enum['is-part-of-program'], program);
	await containers.persist();
	await relations.persist();

	await deleteContainerRecursively(await getContainerByGuid(earlierGoal.guid)(connection))(
		connection
	);
	await backdateDeletion(connection, earlierGoal.guid);
	const before = await snapshot(connection, [program.guid, goal.guid]);

	await deleteContainerRecursively(before.get(program.guid)!)(connection);
	await restoreContainerRecursively(program.guid)(connection);

	await expectRestored(connection, before);
	await expect(getContainerByGuid(earlierGoal.guid)(connection)).rejects.toThrow();
});

test('restoring a measure brings back its sections and the templates available only in it', async ({
	connection,
	containers,
	relations
}) => {
	const measure = containers.add({ type: payloadTypes.enum.measure });
	const section = containers.add({
		body: 'Section body',
		title: 'Section',
		type: payloadTypes.enum.text
	});
	const template = containers.add({
		template: true,
		title: 'Template',
		type: payloadTypes.enum.report
	});
	relations.add(section, predicates.enum['is-section-of'], measure);
	relations.add(template, predicates.enum['is-available-in'], measure);
	await containers.persist();
	await relations.persist();
	const before = await snapshot(connection, [measure.guid, section.guid, template.guid]);

	await deleteContainerRecursively(before.get(measure.guid)!)(connection);
	for (const guid of before.keys()) {
		await expect(getContainerByGuid(guid)(connection)).rejects.toThrow();
	}

	await restoreContainerRecursively(measure.guid)(connection);

	await expectRestored(connection, before);
});

test('restoring an organizational unit brings back the containers it owned', async ({
	connection,
	containers
}) => {
	const organizationalUnit = containers.add({
		name: 'Unit',
		type: payloadTypes.enum.organizational_unit
	});
	const measure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organizational_unit: organizationalUnit.guid }
	);
	await containers.persist();
	const before = await snapshot(connection, [organizationalUnit.guid, measure.guid]);

	await deleteOrganizationalUnitContainer(
		before.get(organizationalUnit.guid) as Container<OrganizationalUnitPayload>
	)(connection);
	await expect(getContainerByGuid(measure.guid)(connection)).rejects.toThrow();

	await restoreContainerRecursively(organizationalUnit.guid)(connection);

	await expectRestored(connection, before);
});

test('restoring a program reattaches the shared goal that survived its deletion', async ({
	connection,
	programPair
}) => {
	const { childOfShared, firstProgram, sharedGoal } = programPair;
	const before = await snapshot(connection, [
		firstProgram.guid,
		sharedGoal.guid,
		childOfShared.guid
	]);

	await deleteContainerRecursively(before.get(firstProgram.guid)!)(connection);
	expect((await getContainerByGuid(sharedGoal.guid)(connection)).relation).not.toEqual(
		before.get(sharedGoal.guid)!.relation
	);

	await restoreContainerRecursively(firstProgram.guid)(connection);

	await expectRestored(connection, new Map([[firstProgram.guid, before.get(firstProgram.guid)!]]));
	expect(await getContainerByGuid(sharedGoal.guid)(connection)).toEqual(
		before.get(sharedGoal.guid)
	);
	expect(await getContainerByGuid(childOfShared.guid)(connection)).toEqual(
		before.get(childOfShared.guid)
	);
});

test('omitting the template filter returns a complete mixed program hierarchy', async ({
	connection,
	containers,
	relations
}) => {
	const program = containers.add({
		template: true,
		title: 'Program template',
		type: payloadTypes.enum.program
	});
	const measure = containers.add({
		template: true,
		title: 'Measure template',
		type: payloadTypes.enum.measure
	});
	const section = containers.add({
		body: 'Section body',
		title: 'Section',
		type: payloadTypes.enum.text
	});
	relations.add(measure, predicates.enum['is-part-of-program'], program);
	relations.add(section, predicates.enum['is-section-of'], measure);
	await containers.persist();
	await relations.persist();

	const all = await getAllContainersRelatedToProgram(program.guid, {})(connection);
	const templates = await getAllContainersRelatedToProgram(program.guid, { template: true })(
		connection
	);
	const nonTemplates = await getAllContainersRelatedToProgram(program.guid, { template: false })(
		connection
	);

	expect(all.map(({ guid }) => guid)).toEqual(
		expect.arrayContaining([program.guid, measure.guid, section.guid])
	);
	expect(templates.map(({ guid }) => guid)).toEqual(
		expect.arrayContaining([program.guid, measure.guid])
	);
	expect(templates.map(({ guid }) => guid)).not.toContain(section.guid);
	expect(nonTemplates.map(({ guid }) => guid)).toContain(section.guid);
	expect(nonTemplates.map(({ guid }) => guid)).not.toContain(program.guid);
	expect(nonTemplates.map(({ guid }) => guid)).not.toContain(measure.guid);
});

// An indicator is in use once it is related to a container of the organization the
// way the app relates them: an effect (created by createEffect for a measure) is
// measured by it, an objective (created by createObjective for a goal) is an objective
// for it, or actual data names it in its payload.
test('getIndicatorGuidsInUse returns the indicators measured or reported on within scope', async ({
	connection,
	containers,
	organization,
	relations
}) => {
	const otherOrganization = uuid();
	const organizationalUnit = uuid();
	const indicator = (title: string) =>
		containers.add({ title, type: payloadTypes.enum.indicator, unit: 'unit.percent' });
	const actualData = (indicator: string, options: ContainerFixtureOptions = {}) =>
		containers.add(
			{ indicator, title: 'Actual data', type: payloadTypes.enum.actual_data },
			options
		);

	const measured = indicator('Measured by an effect');
	const objective = indicator('Objective of a goal');
	const reported = indicator('Reported on by actual data');
	const reportedInUnit = indicator('Reported on by actual data of a unit');
	const measuredElsewhere = indicator('Measured by an effect of another organization');
	const reportedElsewhere = indicator('Reported on by actual data of another organization');
	const unused = indicator('Unused');

	const measure = containers.add({ type: payloadTypes.enum.measure });
	const effect = containers.add({ type: payloadTypes.enum.effect });
	relations.add(effect, predicates.enum['is-part-of'], measure);
	relations.add(effect, predicates.enum['is-measured-by'], measured);

	const goal = containers.add({ type: payloadTypes.enum.goal });
	const goalObjective = containers.add({ type: payloadTypes.enum.objective });
	relations.add(goalObjective, predicates.enum['is-part-of'], goal);
	relations.add(goalObjective, predicates.enum['is-objective-for'], objective);

	actualData(reported.guid);
	actualData(reportedInUnit.guid, { organizational_unit: organizationalUnit });

	const otherMeasure = containers.add(
		{ type: payloadTypes.enum.measure },
		{ organization: otherOrganization }
	);
	const otherEffect = containers.add(
		{ type: payloadTypes.enum.effect },
		{ organization: otherOrganization }
	);
	relations.add(otherEffect, predicates.enum['is-part-of'], otherMeasure);
	relations.add(otherEffect, predicates.enum['is-measured-by'], measuredElsewhere);

	actualData(reportedElsewhere.guid, {
		organization: otherOrganization
	});

	await containers.persist();
	await relations.persist();

	const inOrganization = await getIndicatorGuidsInUse(
		{ organizations: [organization] },
		{ organizations: [organization], organizationalUnits: null }
	)(connection);
	expect(inOrganization.sort()).toEqual([measured.guid, objective.guid, reported.guid].sort());
	expect(inOrganization).not.toContain(unused.guid);
	expect(inOrganization).not.toContain(measuredElsewhere.guid);
	expect(inOrganization).not.toContain(reportedElsewhere.guid);

	const inUnit = await getIndicatorGuidsInUse(
		{ organizations: [organization], organizationalUnits: [organizationalUnit] },
		{ organizations: [organization], organizationalUnits: [organizationalUnit] }
	)(connection);
	expect(inUnit).toEqual([reportedInUnit.guid]);
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
				type: payloadTypes.enum.indicator,
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
				type: payloadTypes.enum.indicator,
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
				type: payloadTypes.enum.indicator,
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
			publicIndicator.guid
		])
	);
	expect(resultGuids).not.toContain(deletedIntermediate.guid);
	expect(resultGuids).not.toContain(belowDeleted.guid);
	expect(resultGuids).not.toContain(payloadOnlyIndicator.guid);
	expect(resultGuids).not.toContain(privateIndicatorSection.guid);
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

test('getContainerCopyGraph includes program availability targets without traversing them', async ({
	connection
}: Fixtures) => {
	const program = await createContainer(newManagedByContainer(payloadTypes.enum.program))(
		connection
	);
	const programSection = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: program.guid,
					position: 0,
					predicate: predicates.enum['is-section-of']
				}
			]
		})
	)(connection);
	const template = await createContainer(
		initializeNewContainer(
			{
				template: true,
				title: 'Program template',
				type: payloadTypes.enum.report
			},
			[
				{
					object: program.guid,
					position: 0,
					predicate: predicates.enum['is-available-in']
				}
			]
		)
	)(connection);

	const result = await getContainerCopyGraph(template.guid)(connection);
	const resultGuids = result.containers.map(({ guid }) => guid);

	expect(resultGuids).toEqual(expect.arrayContaining([template.guid, program.guid]));
	expect(resultGuids).not.toContain(programSection.guid);
});

test('getContainerCopyGraph traverses template-root hierarchies available in a program', async ({
	connection
}: Fixtures) => {
	const program = await createContainer(newManagedByContainer(payloadTypes.enum.program))(
		connection
	);
	const programSection = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: program.guid,
					position: 0,
					predicate: predicates.enum['is-section-of']
				}
			]
		})
	)(connection);
	const availableTemplate = await createContainer(
		initializeNewContainer(
			{
				template: true,
				title: 'Available template',
				type: payloadTypes.enum.report
			},
			[
				{
					object: program.guid,
					position: 0,
					predicate: predicates.enum['is-available-in']
				}
			]
		)
	)(connection);
	const availableTemplateSection = await createContainer(
		initializeNewContainer(
			{
				template: true,
				title: 'Available template section',
				type: payloadTypes.enum.goal
			},
			[
				{
					object: availableTemplate.guid,
					position: 0,
					predicate: predicates.enum['is-section-of']
				}
			]
		)
	)(connection);
	const globalTemplate = await createContainer(
		initializeNewContainer(
			{
				template: true,
				title: 'Global template',
				type: payloadTypes.enum.report
			},
			[]
		)
	)(connection);
	const nonRootTemplate = await createContainer(
		initializeNewContainer(
			{
				template: true,
				title: 'Available non-root template',
				type: payloadTypes.enum.goal
			},
			[
				{
					object: program.guid,
					position: 0,
					predicate: predicates.enum['is-available-in']
				},
				{
					object: globalTemplate.guid,
					position: 0,
					predicate: predicates.enum['is-section-of']
				}
			]
		)
	)(connection);
	const otherProgram = await createContainer(newManagedByContainer(payloadTypes.enum.program))(
		connection
	);
	const otherProgramTemplate = await createContainer(
		initializeNewContainer(
			{
				template: true,
				title: 'Other program template',
				type: payloadTypes.enum.report
			},
			[
				{
					object: otherProgram.guid,
					position: 0,
					predicate: predicates.enum['is-available-in']
				}
			]
		)
	)(connection);

	const result = await getContainerCopyGraph(program.guid)(connection);
	const resultGuids = result.containers.map(({ guid }) => guid);

	expect(resultGuids).toEqual(
		expect.arrayContaining([
			program.guid,
			programSection.guid,
			availableTemplate.guid,
			availableTemplateSection.guid
		])
	);
	expect(resultGuids).not.toContain(globalTemplate.guid);
	expect(resultGuids).not.toContain(nonRootTemplate.guid);
	expect(resultGuids).not.toContain(otherProgram.guid);
	expect(resultGuids).not.toContain(otherProgramTemplate.guid);
});

test('getContainerCopyGraph ignores actual data references and follows resource data references forward only', async ({
	connection
}: Fixtures) => {
	const indicator = await createContainer(
		initializeNewContainer(
			{
				title: 'Indicator',
				type: payloadTypes.enum.indicator,
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
	const resourceSection = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [
				{
					object: resource.guid,
					position: 1,
					predicate: predicates.enum['is-section-of']
				}
			]
		})
	)(connection);
	const deletedResource = await createContainer(
		initializeNewContainer(
			{
				title: 'Deleted resource',
				type: payloadTypes.enum.resource_v2,
				visibility: visibility.enum.organization
			},
			[]
		)
	)(connection);
	const dataWithDeletedResource = await createContainer(
		initializeNewContainer(
			{
				resource: deletedResource.guid,
				resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
				title: 'Data with deleted resource',
				type: payloadTypes.enum.resource_data
			},
			[]
		)
	)(connection);
	await connection.query(sql.typeAlias('void')`
		UPDATE container
		SET deleted = true
		WHERE guid = ${deletedResource.guid}
			AND valid_currently
	`);

	const guidsFor = async (rootGuid: string) =>
		(await getContainerCopyGraph(rootGuid)(connection)).containers.map(({ guid }) => guid);

	expect(await guidsFor(actualData.guid)).toEqual([actualData.guid]);
	expect(await guidsFor(indicator.guid)).toEqual([indicator.guid]);
	expect(await guidsFor(resourceData.guid)).toEqual(
		expect.arrayContaining([resourceData.guid, resource.guid])
	);
	expect(await guidsFor(resourceData.guid)).not.toContain(resourceSection.guid);
	expect(await guidsFor(resource.guid)).toEqual(
		expect.arrayContaining([resource.guid, resourceSection.guid])
	);
	expect(await guidsFor(dataWithDeletedResource.guid)).toEqual([dataWithDeletedResource.guid]);
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

test('getContainerCopyGraph fetches the indicators of an indicator dashboard', async ({
	connection
}: Fixtures) => {
	const indicator = await createContainer(
		initializeNewContainer(
			{
				title: 'Indicator',
				type: payloadTypes.enum.indicator,
				unit: 'unit.percent'
			},
			[]
		)
	)(connection);
	const dashboard = await createContainer(
		initializeNewContainer(
			{
				item: [indicator.guid],
				title: 'Dashboard',
				type: payloadTypes.enum.indicator_dashboard
			},
			[]
		)
	)(connection);

	const result = await getContainerCopyGraph(dashboard.guid)(connection);

	expect(result.containers.map(({ guid }) => guid)).toEqual(
		expect.arrayContaining([dashboard.guid, indicator.guid])
	);
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

test('computeManagedBy: section managed by the team of its measure', async ({
	connection
}: Fixtures) => {
	const member = await createTestUser(connection);
	const measure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, { memberOf: member })
	)(connection);
	const section = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [{ object: measure.guid, position: 0, predicate: predicates.enum['is-section-of'] }]
		})
	)(connection);
	const result = await computeManagedBy(connection, [section.guid]);
	expect(result.get(section.guid)).toEqual([measure.guid]);
});

test('updating the managed_by of a measure propagates to its sections', async ({
	connection
}: Fixtures) => {
	const measure = await createContainer(newManagedByContainer(payloadTypes.enum.measure))(
		connection
	);
	const section = await createContainer(
		newManagedByContainer(payloadTypes.enum.text, {
			relation: [{ object: measure.guid, position: 0, predicate: predicates.enum['is-section-of'] }]
		})
	)(connection);

	const persistedMeasure = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(
		modifiedContainer.parse({ ...persistedMeasure, managed_by: [measure.guid] })
	)(connection);

	const persistedSection = await getContainerByGuid(section.guid)(connection);
	expect(persistedSection.managed_by).toEqual([measure.guid]);
});

test('updating the managed_by of a measure propagates to resources and sub-measures', async ({
	connection
}: Fixtures) => {
	const measure = await createContainer(newManagedByContainer(payloadTypes.enum.measure))(
		connection
	);
	const resource = await createContainer(
		newManagedByContainer(payloadTypes.enum.resource, {
			relation: [
				{ object: measure.guid, position: 0, predicate: predicates.enum['is-part-of-measure'] }
			]
		})
	)(connection);
	const subMeasure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{ object: measure.guid, position: 0, predicate: predicates.enum['is-part-of-measure'] }
			]
		})
	)(connection);

	const persistedMeasure = await getContainerByGuid(measure.guid)(connection);
	await updateContainer(
		modifiedContainer.parse({ ...persistedMeasure, managed_by: [measure.guid] })
	)(connection);

	expect((await getContainerByGuid(resource.guid)(connection)).managed_by).toEqual([measure.guid]);
	expect((await getContainerByGuid(subMeasure.guid)(connection)).managed_by).toEqual([
		measure.guid
	]);
});

test('updating the managed_by of a sub-measure leaves its parent measure untouched', async ({
	connection
}: Fixtures) => {
	const measure = await createContainer(newManagedByContainer(payloadTypes.enum.measure))(
		connection
	);
	const subMeasure = await createContainer(
		newManagedByContainer(payloadTypes.enum.measure, {
			relation: [
				{ object: measure.guid, position: 0, predicate: predicates.enum['is-part-of-measure'] }
			]
		})
	)(connection);

	const persistedSubMeasure = await getContainerByGuid(subMeasure.guid)(connection);
	await updateContainer(
		modifiedContainer.parse({ ...persistedSubMeasure, managed_by: [subMeasure.guid] })
	)(connection);

	expect((await getContainerByGuid(measure.guid)(connection)).managed_by).toEqual([organization]);
});

test('getAdoptedContainerGuids: adopted programs and their contents', async ({
	connection
}: Fixtures) => {
	const adopter = await createContainer(
		initializeNewContainer(
			{ name: 'Lorem ipsum', type: payloadTypes.enum.organizational_unit } as Partial<AnyPayload> &
				Pick<AnyPayload, 'type'>,
			[]
		)
	)(connection);
	const program = await createContainer(
		initializeNewContainer(simplePayload(payloadTypes.enum.program), [
			{ object: adopter.guid, position: 0, predicate: predicates.enum['is-adopted-by'] }
		])
	)(connection);
	const rule = await createContainer(
		initializeNewContainer(simplePayload(payloadTypes.enum.rule), [
			{ object: program.guid, position: 0, predicate: predicates.enum['is-part-of-program'] }
		])
	)(connection);
	const section = await createContainer(
		initializeNewContainer(simplePayload(payloadTypes.enum.rule), [
			{ object: program.guid, position: 0, predicate: predicates.enum['is-section-of'] }
		])
	)(connection);
	const nested = await createContainer(
		initializeNewContainer(simplePayload(payloadTypes.enum.rule), [
			{ object: section.guid, position: 0, predicate: predicates.enum['is-part-of'] }
		])
	)(connection);
	await createContainer(initializeNewContainer(simplePayload(payloadTypes.enum.rule), []))(
		connection
	);

	const adopted = await getAdoptedContainerGuids([adopter.guid])(connection);
	expect(adopted.toSorted()).toEqual(
		[program.guid, rule.guid, section.guid, nested.guid].toSorted()
	);

	expect(await getAdoptedContainerGuids([uuid()])(connection)).toEqual([]);
	expect(await getAdoptedContainerGuids([])(connection)).toEqual([]);
});

test('getAdoptedContainerGuids: several adopters of one program are deduplicated', async ({
	connection
}: Fixtures) => {
	const adopter = await createContainer(
		initializeNewContainer(
			{ name: 'Lorem ipsum', type: payloadTypes.enum.organizational_unit } as Partial<AnyPayload> &
				Pick<AnyPayload, 'type'>,
			[]
		)
	)(connection);
	const anotherAdopter = await createContainer(
		initializeNewContainer(
			{
				name: 'Dolor sit amet',
				type: payloadTypes.enum.organizational_unit
			} as Partial<AnyPayload> & Pick<AnyPayload, 'type'>,
			[]
		)
	)(connection);
	const program = await createContainer(
		initializeNewContainer(simplePayload(payloadTypes.enum.program), [
			{ object: adopter.guid, position: 0, predicate: predicates.enum['is-adopted-by'] },
			{ object: anotherAdopter.guid, position: 0, predicate: predicates.enum['is-adopted-by'] }
		])
	)(connection);

	const adopted = await getAdoptedContainerGuids([adopter.guid, anotherAdopter.guid])(connection);
	expect(adopted).toEqual([program.guid]);
});

test('getManyContainers: includeGuids widens the organization scope', async ({
	connection
}: Fixtures) => {
	const foreignOrganization = uuid();
	const foreignRule = await createContainer(
		newContainer.parse({
			managed_by: foreignOrganization,
			organization: foreignOrganization,
			organizational_unit: null,
			payload: simplePayload(payloadTypes.enum.rule),
			realm,
			relation: []
		})
	)(connection);
	const ownRule = await createContainer(
		initializeNewContainer(simplePayload(payloadTypes.enum.rule), [])
	)(connection);

	const withoutIncludeGuids = await getManyContainers(
		[organization],
		{ type: [payloadTypes.enum.rule] },
		'alpha'
	)(connection);
	expect(withoutIncludeGuids.map(({ guid }) => guid)).toContain(ownRule.guid);
	expect(withoutIncludeGuids.map(({ guid }) => guid)).not.toContain(foreignRule.guid);

	const withIncludeGuids = await getManyContainers(
		[organization],
		{ includeGuids: [foreignRule.guid], type: [payloadTypes.enum.rule] },
		'alpha'
	)(connection);
	expect(withIncludeGuids.map(({ guid }) => guid)).toContain(ownRule.guid);
	expect(withIncludeGuids.map(({ guid }) => guid)).toContain(foreignRule.guid);
});

test('getManyContainers: includeGuids widens the organizational unit scope', async ({
	connection
}: Fixtures) => {
	const foreignOrganization = uuid();
	const foreignUnitRule = await createContainer(
		newContainer.parse({
			managed_by: foreignOrganization,
			organization: foreignOrganization,
			organizational_unit: uuid(),
			payload: simplePayload(payloadTypes.enum.rule),
			realm,
			relation: []
		})
	)(connection);

	const withoutIncludeGuids = await getManyContainers(
		[organization],
		{ organizationalUnits: null, type: [payloadTypes.enum.rule] },
		'alpha'
	)(connection);
	expect(withoutIncludeGuids.map(({ guid }) => guid)).not.toContain(foreignUnitRule.guid);

	const withIncludeGuids = await getManyContainers(
		[organization],
		{
			includeGuids: [foreignUnitRule.guid],
			organizationalUnits: null,
			type: [payloadTypes.enum.rule]
		},
		'alpha'
	)(connection);
	expect(withIncludeGuids.map(({ guid }) => guid)).toContain(foreignUnitRule.guid);
});

test('getManyOrganizationalUnitContainers: includeGuids widens the organization scope', async ({
	connection
}: Fixtures) => {
	const foreignOrganization = uuid();
	const organizationalUnitPayload = (name: string) =>
		({ name, type: payloadTypes.enum.organizational_unit }) as Partial<AnyPayload> &
			Pick<AnyPayload, 'type'>;
	const ownUnit = await createContainer(
		initializeNewContainer(organizationalUnitPayload('Lorem ipsum'), [])
	)(connection);
	const managedForeignUnit = await createContainer(
		newContainer.parse({
			managed_by: foreignOrganization,
			organization: foreignOrganization,
			organizational_unit: null,
			payload: organizationalUnitPayload('Dolor sit amet'),
			realm,
			relation: []
		})
	)(connection);
	const otherForeignUnit = await createContainer(
		newContainer.parse({
			managed_by: foreignOrganization,
			organization: foreignOrganization,
			organizational_unit: null,
			payload: organizationalUnitPayload('Consetetur sadipscing'),
			realm,
			relation: []
		})
	)(connection);

	const withoutGuidFilter = await getManyOrganizationalUnitContainers({
		include: { organization: [organization] }
	})(connection);
	expect(withoutGuidFilter.map(({ guid }) => guid)).toContain(ownUnit.guid);
	expect(withoutGuidFilter.map(({ guid }) => guid)).not.toContain(managedForeignUnit.guid);

	const withGuidFilter = await getManyOrganizationalUnitContainers({
		include: { organization: [organization], guid: [managedForeignUnit.guid] }
	})(connection);

	const guids = withGuidFilter.map(({ guid }) => guid);
	expect(guids).toContain(ownUnit.guid);
	expect(guids).toContain(managedForeignUnit.guid);
	expect(guids).not.toContain(otherForeignUnit.guid);

	// several organizations: all of their units, guids that are no
	// organization simply match nothing
	const withSeveralOrganizations = await getManyOrganizationalUnitContainers({
		include: { organization: [organization, foreignOrganization, ownUnit.guid] }
	})(connection);
	const severalGuids = withSeveralOrganizations.map(({ guid }) => guid);
	expect(severalGuids).toContain(ownUnit.guid);
	expect(severalGuids).toContain(managedForeignUnit.guid);
	expect(severalGuids).toContain(otherForeignUnit.guid);
});

test('derives grants from the member roles, the strongest role per container', async ({
	connection
}: Fixtures) => {
	const member = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid: member, realm, settings: {} })(
		connection
	);
	const headedMeasure = await createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: { title: 'Lorem ipsum', type: payloadTypes.enum.measure },
			realm,
			relation: [],
			user: [
				{ predicate: predicates.enum['is-head-of'], subject: member },
				{ predicate: predicates.enum['is-member-of'], subject: member }
			]
		})
	)(connection);
	const observedProgram = await createContainer(
		newContainer.parse({
			managed_by: organization,
			organization,
			organizational_unit: null,
			payload: { title: 'Lorem ipsum', type: payloadTypes.enum.program },
			realm,
			relation: [],
			user: [{ predicate: predicates.enum['is-member-of'], subject: member }]
		})
	)(connection);

	const grants = await getAllGrantsOfUserFromMemberRoles(member)(connection);

	const setFor = (object: string) => ({
		self: grants.filter((g) => g.object === object && g.target === 'self').map(({ kind }) => kind),
		subordinates: grants
			.filter((g) => g.object === object && g.target === 'subordinates')
			.map(({ kind }) => kind)
	});
	expect(setFor(headedMeasure.guid)).toEqual(grantSetForRole(memberRoles.enum.head));
	expect(setFor(observedProgram.guid)).toEqual(grantSetForRole(memberRoles.enum.observer));
	expect(grants.every(({ subject }) => subject === member)).toBe(true);
});

test('updates fail if the expected revision is no longer current', async ({
	connection
}: Fixtures) => {
	const goal = await createContainer(
		initializeNewContainer(simplePayload(payloadTypes.enum.goal), [])
	)(connection);
	const renamed = (title: string) =>
		modifiedContainer.parse({ ...goal, payload: { ...goal.payload, title } });

	const first = await updateContainer(renamed('First change'), {
		expectedRevision: goal.revision
	})(connection);
	await expect(
		updateContainer(renamed('Stale change'), { expectedRevision: goal.revision })(connection)
	).rejects.toBeInstanceOf(ContainerRevisionConflictError);

	await expect(getContainerByGuid(goal.guid)(connection)).resolves.toMatchObject({
		payload: { title: 'First change' },
		revision: first.revision
	});
});
