import { expect, test } from 'vitest';
import { z } from 'zod';
import {
	type AnyPayload,
	type Container,
	container,
	findDescendants,
	type EffectPayload,
	getAvailableInProgramGuids,
	grantKindsForRole,
	type IndicatorTemplatePayload,
	isTemplateRoot,
	memberRoleFromPredicates,
	type MeasurePayload,
	memberRoleOf,
	memberRoles,
	payloadTypes,
	predicates,
	type ProgramPayload,
	type Relation,
	sortIndicatorsByRelevanceForGoalOrMeasure,
	units,
	userRelationsForMemberRole
} from '$lib/models';
import { addRelation } from '$lib/relations';

const organizationOne = '1d048b81-780a-41ad-813e-5111a23099fb';

const organizationTwo = 'f6709c05-a072-4f6b-ab35-ec26eeb9dfc6';

const testContainer = container.extend({
	organizational_unit: z.uuid().nullable().default(null),
	realm: z.string().default(''),
	revision: z.number().default(0),
	valid_currently: z.boolean().default(true),
	valid_from: z.date().default(new Date())
});

const indicatorTemplateOne = testContainer.parse({
	guid: 'a94a926f-d156-45d2-961f-f55f5bcdb004',
	managed_by: organizationOne,
	organization: organizationOne,
	payload: {
		category: {},
		title: 'Water Consumption',
		type: payloadTypes.enum.indicator_template,
		unit: units.enum['unit.cubic_meter']
	}
}) as Container<IndicatorTemplatePayload>;

const indicatorTemplateTwo = testContainer.parse({
	guid: '69e732e4-fb80-44e8-a465-00b593843764',
	managed_by: organizationOne,
	organization: organizationOne,
	payload: {
		category: {},
		title: 'Waste',
		type: payloadTypes.enum.indicator_template,
		unit: units.enum['unit.kilogram_per_capita']
	}
}) as Container<IndicatorTemplatePayload>;

const indicatorTemplateThree = testContainer.parse({
	guid: '108e39e2-a139-4744-8f37-3203eb9ef3c6',
	organization: organizationTwo,
	managed_by: organizationTwo,
	payload: {
		category: {
			sdg: ['sdg.01'],
			topic: ['topic.resilience']
		},
		title: 'Resilience Index',
		type: payloadTypes.enum.indicator_template,
		unit: units.enum['unit.percent']
	}
}) as Container<IndicatorTemplatePayload>;

const program = testContainer.parse({
	guid: 'f27b7194-1669-444a-ac0d-6380ed80e619',
	managed_by: organizationOne,
	organization: organizationOne,
	payload: {
		category: {},
		title: 'Sustainability Strategy',
		type: payloadTypes.enum.program
	}
}) as Container<ProgramPayload>;

const measure = testContainer.parse({
	guid: '306617a4-32fe-4fb7-9fef-089518a585fa',
	managed_by: organizationOne,
	organization: organizationOne,
	payload: {
		category: {},
		title: 'Reduce water consumption',
		type: payloadTypes.enum.measure
	}
}) as Container<MeasurePayload>;

const effect = testContainer.parse({
	guid: '304bd9e4-55d9-410f-93fb-38a152635b64',
	managed_by: organizationOne,
	organization: organizationOne,
	payload: {
		title: indicatorTemplateOne.payload.title,
		type: payloadTypes.enum.effect
	}
}) as Container<EffectPayload>;

addRelation(effect, predicates.enum['is-part-of'], measure);
addRelation(effect, predicates.enum['is-measured-by'], indicatorTemplateOne);
addRelation(measure, predicates.enum['is-part-of-program'], program);

test('indicator suggested for sub-measure', () => {
	const subMeasure = testContainer.parse({
		guid: '0bcd6298-aa19-4d2f-9e0e-7d9e54ee48aa',
		managed_by: organizationOne,
		organization: organizationOne,
		payload: {
			category: {
				sdg: ['sdg.01', 'sdg.06'],
				topic: ['topic.resilience', 'topic.water']
			},
			title: 'Reduce water consumption in public households',
			type: payloadTypes.enum.measure
		}
	}) as Container<MeasurePayload>;

	addRelation(subMeasure, predicates.enum['is-part-of'], measure);
	addRelation(subMeasure, predicates.enum['is-part-of-program'], program);

	// The expected order of suggestions is:
	// 1. indicatorTemplateOne due to the parent of the measure using the same indicator template (score: 2)
	// 2. indicatorTemplateThree due to the indicator template and the measure having 2 out of 4 categories in common (score: 0.5)
	// 3. indicatorTemplateTwo due to the indicator template having nothing in common with the measure (score: 0)
	const expectedSuggestions = [indicatorTemplateOne, indicatorTemplateThree, indicatorTemplateTwo];

	const actualSuggestions = sortIndicatorsByRelevanceForGoalOrMeasure(
		[indicatorTemplateTwo, indicatorTemplateThree, indicatorTemplateOne],
		[program, measure, effect],
		subMeasure
	);

	expect(actualSuggestions.map(({ guid }) => guid)).toEqual(
		expectedSuggestions.map(({ guid }) => guid)
	);
});

test('indicator suggested for measure in program using indicator', () => {
	const anotherMeasure = testContainer.parse({
		guid: '09237e4f-0150-493f-a572-815ebe2c363a',
		managed_by: organizationOne,
		organization: organizationOne,
		payload: {
			category: {
				sdg: ['sdg.01', 'sdg.06', 'sdg.14'],
				topic: ['topic.resilience', 'topic.water']
			},
			title: 'Rewild the local river',
			type: payloadTypes.enum.measure
		}
	}) as Container<MeasurePayload>;

	addRelation(anotherMeasure, predicates.enum['is-part-of-program'], program);

	// The expected order of suggestions is:
	// 1. indicatorTemplateOne due to the program of the measure using the same indicator template (score: 0.5)
	// 2. indicatorTemplateThree due to the indicator template and the measure having 2 out of 5 categories in common (score: 0.4)
	// 3. indicatorTemplateTwo due to the indicator template having nothing in common with the measure (score: 0)
	const expectedSuggestions = [indicatorTemplateOne, indicatorTemplateThree, indicatorTemplateTwo];

	const actualSuggestions = sortIndicatorsByRelevanceForGoalOrMeasure(
		[indicatorTemplateTwo, indicatorTemplateThree, indicatorTemplateOne],
		[program, measure, effect],
		anotherMeasure
	);

	expect(actualSuggestions.map(({ guid }) => guid)).toEqual(
		expectedSuggestions.map(({ guid }) => guid)
	);
});

test('memberRoleOf picks the highest role from the user relations', () => {
	const observer = '7db24631-935d-4e35-a6d5-5db07f0f4d75';
	const collaborator = '0a4b09c1-92a9-4fa3-8912-1e37c8f38fd5';
	const admin = 'c2b0f442-e0d7-4826-9b17-6ba1e60d8cf9';
	const outsider = 'e9a1bfe4-0000-4000-8000-000000000000';

	const scope = testContainer.parse({
		guid: '52b28d20-2a11-4c1c-9b45-ffae9ac9f2a8',
		managed_by: organizationOne,
		organization: organizationOne,
		payload: { title: 'Scope', type: payloadTypes.enum.measure },
		user: [
			{ predicate: predicates.enum['is-member-of'], subject: observer },
			{ predicate: predicates.enum['is-member-of'], subject: collaborator },
			{ predicate: predicates.enum['is-collaborator-of'], subject: collaborator },
			{ predicate: predicates.enum['is-member-of'], subject: admin },
			{ predicate: predicates.enum['is-head-of'], subject: admin },
			{ predicate: predicates.enum['is-admin-of'], subject: admin }
		]
	}) as Container<MeasurePayload>;

	expect(memberRoleOf({ guid: observer }, scope)).toBe(memberRoles.enum.observer);
	expect(memberRoleOf({ guid: collaborator }, scope)).toBe(memberRoles.enum.collaborator);
	expect(memberRoleOf({ guid: admin }, scope)).toBe(memberRoles.enum.administrator);
	expect(memberRoleOf({ guid: outsider }, scope)).toBeNull();
});

test('userRelationsForMemberRole builds the role relations of a subject', () => {
	const subject = '7db24631-935d-4e35-a6d5-5db07f0f4d75';
	expect(userRelationsForMemberRole(memberRoles.enum.observer, subject)).toEqual([
		{ predicate: predicates.enum['is-member-of'], subject }
	]);
	expect(userRelationsForMemberRole(memberRoles.enum.collaborator, subject)).toEqual([
		{ predicate: predicates.enum['is-member-of'], subject },
		{ predicate: predicates.enum['is-collaborator-of'], subject }
	]);
	expect(userRelationsForMemberRole(memberRoles.enum.administrator, subject)).toEqual([
		{ predicate: predicates.enum['is-member-of'], subject },
		{ predicate: predicates.enum['is-admin-of'], subject }
	]);
});

test('grantKindsForRole maps each role to its granted kinds', () => {
	expect(grantKindsForRole(memberRoles.enum.observer)).toEqual(['read']);
	expect(grantKindsForRole(memberRoles.enum.collaborator)).toEqual(['read', 'update', 'create']);
	expect(grantKindsForRole(memberRoles.enum.head)).toEqual(['read', 'update', 'create', 'delete']);
	expect(grantKindsForRole(memberRoles.enum.administrator)).toEqual([
		'read',
		'update',
		'create',
		'delete',
		'manage-members'
	]);
});

test('memberRoleFromPredicates picks the highest role', () => {
	expect(memberRoleFromPredicates([])).toBeNull();
	expect(memberRoleFromPredicates([predicates.enum['is-member-of']])).toBe(
		memberRoles.enum.observer
	);
	expect(
		memberRoleFromPredicates([
			predicates.enum['is-member-of'],
			predicates.enum['is-collaborator-of']
		])
	).toBe(memberRoles.enum.collaborator);
	expect(
		memberRoleFromPredicates([predicates.enum['is-head-of'], predicates.enum['is-member-of']])
	).toBe(memberRoles.enum.head);
	expect(
		memberRoleFromPredicates([
			predicates.enum['is-admin-of'],
			predicates.enum['is-head-of'],
			predicates.enum['is-member-of']
		])
	).toBe(memberRoles.enum.administrator);
});

const templateRootGuid = 'cf20d9df-b4dc-43ce-bee1-625c065be97e';
const templateParentGuid = 'e155f737-e2f8-48bd-bf13-4c71fd8939e5';
const templateChildGuid = 'e9844538-491d-44cf-8cae-3095b5525127';

function templateRelation(
	subject: string,
	predicate: Relation['predicate'],
	object: string
): Relation {
	return { object, position: 0, predicate, subject };
}

test('recognizes a template without an outgoing structural relation as a root', () => {
	expect(
		isTemplateRoot({
			guid: templateRootGuid,
			payload: { template: true },
			relation: [
				templateRelation(
					templateChildGuid,
					predicates.enum['is-part-of-program'],
					templateRootGuid
				),
				templateRelation(templateRootGuid, predicates.enum['is-copy-of'], templateParentGuid),
				templateRelation(templateRootGuid, predicates.enum['is-available-in'], templateParentGuid)
			]
		})
	).toBe(true);
});

test('rejects a template with an outgoing structural relation as a root', () => {
	expect(
		isTemplateRoot({
			guid: templateRootGuid,
			payload: { template: true },
			relation: [
				templateRelation(templateRootGuid, predicates.enum['is-section-of'], templateParentGuid)
			]
		})
	).toBe(false);
});

test('rejects a non-template without a structural parent as a template root', () => {
	expect(
		isTemplateRoot({
			guid: templateRootGuid,
			payload: { template: false },
			relation: []
		})
	).toBe(false);
});

test('returns only programs targeted by outgoing availability relations', () => {
	expect(
		getAvailableInProgramGuids({
			guid: templateRootGuid,
			relation: [
				templateRelation(templateRootGuid, predicates.enum['is-available-in'], templateParentGuid),
				templateRelation(templateChildGuid, predicates.enum['is-available-in'], templateRootGuid),
				templateRelation(templateRootGuid, predicates.enum['is-copy-of'], templateChildGuid)
			]
		})
	).toEqual([templateParentGuid]);
});

const programOneGuid = '5a6d4c4e-0f3a-4d2b-9a3c-1c2d3e4f5a6b';
const programTwoGuid = '6b7e5d5f-1a4b-4e3c-8b4d-2d3e4f5a6b7c';
const sharedGoalGuid = '7c8f6e60-2b5c-4f4d-9c5e-3e4f5a6b7c8d';
const exclusiveGoalGuid = '8d907f71-3c6d-4a5e-8d6f-4f5a6b7c8d9e';
const childOfSharedGuid = '9ea18082-4d7e-4b6f-9e70-5a6b7c8d9eaf';
const grandchildOfSharedGuid = '59be656a-6c52-4a0b-acc3-44d3b8e5bd96';
const childOfExclusiveGuid = 'c463f243-9e82-4d0a-8569-4d2b8fc2fbb0';
const twoGoalsMeasureGuid = 'af2b9193-5e8f-4c70-8f81-6b7c8d9eafb0';
const twoProgramsMeasureGuid = '2f60d1ab-05a9-499b-85d5-46ee6c99290b';

function structuralContainer(
	guid: string,
	type: (typeof payloadTypes.enum)['program' | 'goal' | 'measure' | 'category' | 'term'],
	relation: Relation[]
) {
	return testContainer.parse({
		guid,
		managed_by: organizationOne,
		organization: organizationOne,
		payload:
			type == payloadTypes.enum.category || type == payloadTypes.enum.term
				? { title: guid, type }
				: { category: {}, title: guid, type },
		relation
	}) as Container<ProgramPayload | MeasurePayload>;
}

const isPartOf = predicates.enum['is-part-of'];
const isPartOfProgram = predicates.enum['is-part-of-program'];
const deletionPredicates = [isPartOf, isPartOfProgram];

const programOne = structuralContainer(programOneGuid, payloadTypes.enum.program, []);
// Belongs to both programs.
const sharedGoal = structuralContainer(sharedGoalGuid, payloadTypes.enum.goal, [
	templateRelation(sharedGoalGuid, isPartOfProgram, programOneGuid),
	templateRelation(sharedGoalGuid, isPartOfProgram, programTwoGuid)
]);
const exclusiveGoal = structuralContainer(exclusiveGoalGuid, payloadTypes.enum.goal, [
	templateRelation(exclusiveGoalGuid, isPartOfProgram, programOneGuid)
]);
// Hangs below the shared goal but is only assigned to program one.
const childOfShared = structuralContainer(childOfSharedGuid, payloadTypes.enum.measure, [
	templateRelation(childOfSharedGuid, isPartOf, sharedGoalGuid),
	templateRelation(childOfSharedGuid, isPartOfProgram, programOneGuid)
]);
const grandchildOfShared = structuralContainer(grandchildOfSharedGuid, payloadTypes.enum.measure, [
	templateRelation(grandchildOfSharedGuid, isPartOf, childOfSharedGuid),
	templateRelation(grandchildOfSharedGuid, isPartOfProgram, programOneGuid)
]);
const childOfExclusive = structuralContainer(childOfExclusiveGuid, payloadTypes.enum.measure, [
	templateRelation(childOfExclusiveGuid, isPartOf, exclusiveGoalGuid),
	templateRelation(childOfExclusiveGuid, isPartOfProgram, programOneGuid)
]);
// Two parents via is-part-of, one of them shared with program two.
const twoGoalsMeasure = structuralContainer(twoGoalsMeasureGuid, payloadTypes.enum.measure, [
	templateRelation(twoGoalsMeasureGuid, isPartOf, exclusiveGoalGuid),
	templateRelation(twoGoalsMeasureGuid, isPartOf, sharedGoalGuid),
	templateRelation(twoGoalsMeasureGuid, isPartOfProgram, programOneGuid)
]);
// Below the exclusive goal, but assigned to both programs.
const twoProgramsMeasure = structuralContainer(twoProgramsMeasureGuid, payloadTypes.enum.measure, [
	templateRelation(twoProgramsMeasureGuid, isPartOf, exclusiveGoalGuid),
	templateRelation(twoProgramsMeasureGuid, isPartOfProgram, programOneGuid),
	templateRelation(twoProgramsMeasureGuid, isPartOfProgram, programTwoGuid)
]);
const programOneMembers = [
	programOne,
	sharedGoal,
	exclusiveGoal,
	childOfShared,
	grandchildOfShared,
	childOfExclusive,
	twoGoalsMeasure,
	twoProgramsMeasure
];

const guidsOf = (containers: Container<AnyPayload>[]) => containers.map(({ guid }) => guid).sort();

test('findDescendants without the flag still returns every descendant', () => {
	expect(guidsOf(findDescendants(programOne, programOneMembers, deletionPredicates))).toEqual(
		[
			sharedGoalGuid,
			exclusiveGoalGuid,
			childOfSharedGuid,
			grandchildOfSharedGuid,
			childOfExclusiveGuid,
			twoGoalsMeasureGuid,
			twoProgramsMeasureGuid
		].sort()
	);
});

test('deleting a program spares what still hangs elsewhere, including the subtree below it', () => {
	expect(guidsOf(findDescendants(programOne, programOneMembers, deletionPredicates, true))).toEqual(
		[exclusiveGoalGuid, childOfExclusiveGuid].sort()
	);
});

test('the result does not depend on the order of the candidates', () => {
	expect(
		guidsOf(findDescendants(programOne, [...programOneMembers].reverse(), deletionPredicates, true))
	).toEqual([exclusiveGoalGuid, childOfExclusiveGuid].sort());
});

test('deleting a goal takes its measures along although they also belong to the program', () => {
	expect(
		guidsOf(findDescendants(exclusiveGoal, programOneMembers, deletionPredicates, true))
	).toEqual([childOfExclusiveGuid, twoProgramsMeasureGuid].sort());
});

test('deleting a node with several parents itself still takes its subtree along', () => {
	expect(guidsOf(findDescendants(sharedGoal, programOneMembers, deletionPredicates, true))).toEqual(
		[childOfSharedGuid, grandchildOfSharedGuid].sort()
	);
});

test('a node whose parents all fall within the deletion is deleted as well', () => {
	const programGuid = 'f4d0af1f-bae2-4a79-b407-6c7fa2c45f80';
	const firstGoalGuid = 'a2a4a958-4d28-46f7-89e3-fd8fc1f57bf6';
	const secondGoalGuid = '62fa1630-833a-42a9-b008-47433f5179c0';
	const measureGuid = '54bbc13e-5f8a-40eb-beff-98d31f1de3c1';
	const program = structuralContainer(programGuid, payloadTypes.enum.program, []);
	const firstGoal = structuralContainer(firstGoalGuid, payloadTypes.enum.goal, [
		templateRelation(firstGoalGuid, isPartOfProgram, programGuid)
	]);
	const secondGoal = structuralContainer(secondGoalGuid, payloadTypes.enum.goal, [
		templateRelation(secondGoalGuid, isPartOfProgram, programGuid)
	]);
	const measure = structuralContainer(measureGuid, payloadTypes.enum.measure, [
		templateRelation(measureGuid, isPartOf, firstGoalGuid),
		templateRelation(measureGuid, isPartOf, secondGoalGuid),
		templateRelation(measureGuid, isPartOfProgram, programGuid)
	]);

	expect(
		guidsOf(
			findDescendants(program, [program, firstGoal, secondGoal, measure], deletionPredicates, true)
		)
	).toEqual([firstGoalGuid, secondGoalGuid, measureGuid].sort());
});

test('the flag applies to every predicate, e.g. terms in several categories', () => {
	const isPartOfCategory = predicates.enum['is-part-of-category'];
	const firstCategoryGuid = '08790153-599a-4832-a9a7-27d8a7853934';
	const secondCategoryGuid = '5b4ab097-2876-46ab-b26e-3378360b1779';
	const sharedTermGuid = 'fa67809b-7ae3-403e-b395-b8de628a4319';
	const exclusiveTermGuid = '6ae5f87f-3bb7-4550-a76e-88b6fe123500';
	const firstCategory = structuralContainer(firstCategoryGuid, payloadTypes.enum.category, []);
	const sharedTerm = structuralContainer(sharedTermGuid, payloadTypes.enum.term, [
		templateRelation(sharedTermGuid, isPartOfCategory, firstCategoryGuid),
		templateRelation(sharedTermGuid, isPartOfCategory, secondCategoryGuid)
	]);
	const exclusiveTerm = structuralContainer(exclusiveTermGuid, payloadTypes.enum.term, [
		templateRelation(exclusiveTermGuid, isPartOfCategory, firstCategoryGuid)
	]);

	expect(
		guidsOf(findDescendants(firstCategory, [sharedTerm, exclusiveTerm], [isPartOfCategory], true))
	).toEqual([exclusiveTermGuid]);
	expect(
		guidsOf(findDescendants(firstCategory, [sharedTerm, exclusiveTerm], [isPartOfCategory]))
	).toEqual([sharedTermGuid, exclusiveTermGuid].sort());
});

test('cyclic relations do not trap the traversal when ignoring multi-parent nodes', () => {
	const programGuid = '2c68bdc4-9df1-47f4-88a9-7a0b5aae1766';
	const firstGuid = '7cb7e038-b50c-4c9d-984f-527ed36479b2';
	const secondGuid = 'b85f684a-e611-4116-b467-b9948d8fe058';
	const program = structuralContainer(programGuid, payloadTypes.enum.program, []);
	const first = structuralContainer(firstGuid, payloadTypes.enum.goal, [
		templateRelation(firstGuid, isPartOf, secondGuid),
		templateRelation(firstGuid, isPartOfProgram, programGuid)
	]);
	const second = structuralContainer(secondGuid, payloadTypes.enum.goal, [
		templateRelation(secondGuid, isPartOf, firstGuid),
		templateRelation(secondGuid, isPartOfProgram, programGuid)
	]);

	expect(
		guidsOf(findDescendants(program, [program, first, second], deletionPredicates, true))
	).toEqual([firstGuid, secondGuid].sort());
});
