import { expect, test } from 'vitest';
import { z } from 'zod';
import {
	type Container,
	container,
	type EffectPayload,
	grantKindsForRole,
	type GrantKindsByRole,
	type IndicatorTemplatePayload,
	memberRoleFromPredicates,
	type MeasurePayload,
	memberRoleOf,
	memberRoles,
	payloadTypes,
	predicates,
	type ProgramPayload,
	roleAfterGrantToggle,
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
	expect(grantKindsForRole(memberRoles.enum.collaborator)).toEqual([
		'read',
		'update',
		'create',
		'delete'
	]);
	expect(grantKindsForRole(memberRoles.enum.head)).toEqual([
		'read',
		'update',
		'create',
		'delete',
		'manage-members'
	]);
	expect(grantKindsForRole(memberRoles.enum.administrator)).toEqual(
		grantKindsForRole(memberRoles.enum.head)
	);
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

test('roleAfterGrantToggle snaps within organization-shaped role sets', () => {
	// on an organization container observer and collaborator only read, while
	// head additionally updates and manages members
	const kindsByRole: GrantKindsByRole = [
		[null, []],
		[memberRoles.enum.observer, ['read']],
		[memberRoles.enum.collaborator, ['read']],
		[memberRoles.enum.head, ['read', 'update', 'manage-members']]
	];

	expect(roleAfterGrantToggle(kindsByRole, memberRoles.enum.observer, 'update', true)).toBe(
		memberRoles.enum.head
	);
	expect(roleAfterGrantToggle(kindsByRole, memberRoles.enum.head, 'manage-members', false)).toBe(
		memberRoles.enum.observer
	);
	expect(roleAfterGrantToggle(kindsByRole, memberRoles.enum.observer, 'read', false)).toBeNull();
	expect(
		roleAfterGrantToggle(kindsByRole, memberRoles.enum.observer, 'delete', true)
	).toBeUndefined();
});

test('roleAfterGrantToggle snaps within measure-shaped role sets', () => {
	// on a self-managed measure the collaborator role already includes delete
	const kindsByRole: GrantKindsByRole = [
		[null, []],
		[memberRoles.enum.observer, ['read']],
		[memberRoles.enum.collaborator, ['read', 'update', 'create', 'delete']],
		[memberRoles.enum.head, ['read', 'update', 'create', 'delete', 'manage-members']]
	];

	expect(roleAfterGrantToggle(kindsByRole, memberRoles.enum.observer, 'create', true)).toBe(
		memberRoles.enum.collaborator
	);
	expect(roleAfterGrantToggle(kindsByRole, memberRoles.enum.head, 'delete', false)).toBe(
		memberRoles.enum.observer
	);
	expect(roleAfterGrantToggle(kindsByRole, memberRoles.enum.collaborator, 'update', true)).toBe(
		memberRoles.enum.collaborator
	);
});

test('roleAfterGrantToggle keeps public read even without a role', () => {
	const kindsByRole: GrantKindsByRole = [
		[null, ['read']],
		[memberRoles.enum.observer, ['read']],
		[memberRoles.enum.collaborator, ['read']],
		[memberRoles.enum.head, ['read', 'update', 'manage-members']]
	];

	expect(
		roleAfterGrantToggle(kindsByRole, memberRoles.enum.observer, 'read', false)
	).toBeUndefined();
});

test('roleAfterGrantToggle never removes the membership on a tie', () => {
	// on a public self-managed container non-members read as well, so removing
	// a kind must demote to observer instead of dropping the membership
	const kindsByRole: GrantKindsByRole = [
		[null, ['read']],
		[memberRoles.enum.observer, ['read']],
		[memberRoles.enum.collaborator, ['read', 'update', 'create', 'delete']],
		[memberRoles.enum.head, ['read', 'update', 'create', 'delete', 'manage-members']]
	];

	expect(roleAfterGrantToggle(kindsByRole, memberRoles.enum.collaborator, 'delete', false)).toBe(
		memberRoles.enum.observer
	);
	expect(roleAfterGrantToggle(kindsByRole, memberRoles.enum.head, 'update', false)).toBe(
		memberRoles.enum.observer
	);
});
