import { expect, test } from 'vitest';
import {
	effectValuePayload,
	newIndicatorForObjectiveOrEffect,
	newObjectiveOrEffectContainers,
	objectiveValuePayload,
	valueKindOptions
} from '$lib/objectiveOrEffectCreation';
import {
	anyContainer,
	composeUserGrants,
	type Container,
	type GoalPayload,
	grantSetForRole,
	type IndicatorPayload,
	type MeasurePayload,
	memberRoles
} from '$lib/models';

test.each([
	[undefined, ['IOOI'], true, ['tendency', 'series', 'binary']],
	[undefined, ['IOOI'], false, ['tendency', 'series']],
	[undefined, [], true, ['series', 'binary']],
	['indicator', ['IOOI'], true, ['tendency', 'series']],
	['indicator', [], true, ['series']],
	['binary_indicator', ['IOOI'], false, ['binary']],
	['binary_indicator', [], false, ['binary']]
] as const)(
	'effects for indicator type %s with features %j and binary creation %s',
	(indicatorType, features, mayCreateBinaryIndicator, expected) => {
		expect(
			valueKindOptions({ features: [...features], indicatorType, mayCreateBinaryIndicator })
		).toEqual(expected);
	}
);

test('planned values are sorted and accompanied by achieved values for the same years', () => {
	expect(
		effectValuePayload({
			kind: 'series',
			plannedValues: [
				[2030, 50],
				[2026, 10]
			],
			achievedValues: [
				[2026, 8],
				[2031, 60]
			]
		})
	).toEqual({
		achievedValues: [
			[2026, 8],
			[2030, 0]
		],
		plannedValues: [
			[2026, 10],
			[2030, 50]
		]
	});
});

test('wanted values of an objective are sorted', () => {
	expect(
		objectiveValuePayload({
			kind: 'series',
			wantedValues: [
				[2030, -5],
				[2026, -1]
			]
		})
	).toEqual({
		wantedValues: [
			[2026, -1],
			[2030, -5]
		]
	});
});

test('tendencies and yes/no effects carry only their value', () => {
	expect(effectValuePayload({ kind: 'tendency', trendValue: -1 })).toEqual({ trendValue: -1 });
	expect(effectValuePayload({ kind: 'binary', booleanValue: true })).toEqual({
		booleanValue: true
	});
});

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const headSet = grantSetForRole(memberRoles.enum.head);

function stored(guid: string, payload: Record<string, unknown>) {
	return anyContainer.parse({
		guid,
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload,
		realm: 'knot-dots',
		revision: 1,
		user_grant: composeUserGrants({
			scopeSourced: true,
			governsItself: true,
			organizationSelf: headSet.self,
			organizationalUnitSelf: [],
			sources: [{ guid: organizationGuid, self: headSet.self, subordinates: headSet.subordinates }]
		}),
		valid_currently: true,
		valid_from: new Date()
	});
}

const organization = stored(organizationGuid, { name: 'Org', type: 'organization' });

const measure = stored('00000000-0000-4000-8000-000000000002', {
	category: { sdg: ['sdg.11'], topic: ['topic.mobility'], audience: ['audience.citizens'] },
	title: 'Expand cycling infrastructure',
	type: 'measure'
}) as Container<MeasurePayload>;

test('a new indicator lives in the scope and takes over the categories applying to indicators', () => {
	const indicator = newIndicatorForObjectiveOrEffect({
		categoryKeys: ['sdg', 'topic'],
		kind: 'series',
		scope: organization,
		target: measure,
		title: 'Share of cycling in the modal split',
		unit: 'unit.percent'
	});

	expect(indicator).toMatchObject({
		managed_by: [organizationGuid],
		organization: organizationGuid,
		relation: [],
		payload: {
			category: { sdg: ['sdg.11'], topic: ['topic.mobility'] },
			indicatorCategory: ['indicator_category.custom'],
			title: 'Share of cycling in the modal split',
			type: 'indicator',
			unit: 'unit.percent'
		}
	});
});

test('a yes/no effect gets a binary indicator without unit', () => {
	const indicator = newIndicatorForObjectiveOrEffect({
		categoryKeys: [],
		kind: 'binary',
		scope: organization,
		target: measure,
		title: 'Bike lanes exist'
	});

	expect(indicator.payload.type).toBe('binary_indicator');
	expect(indicator.payload).not.toHaveProperty('unit');
	expect(indicator.payload.category).toEqual({});
});

const indicator = stored('00000000-0000-4000-8000-000000000003', {
	title: 'Modal split',
	type: 'indicator',
	unit: 'unit.percent'
}) as Container<IndicatorPayload>;

test('an effect for an existing indicator is measured by it and part of the target', () => {
	const containers = newObjectiveOrEffectContainers(measure, {
		type: 'effect',
		description: 'More people cycle.',
		indicator: { kind: 'existing', container: indicator },
		iooiType: 'iooi.outcome',
		value: { kind: 'tendency', trendValue: 1 }
	});

	expect(containers).toEqual([
		{
			guid: expect.any(String),
			managed_by: measure.managed_by,
			organization: organizationGuid,
			organizational_unit: null,
			payload: {
				description: 'More people cycle.',
				iooiType: 'iooi.outcome',
				title: 'Modal split',
				trendValue: 1,
				type: 'effect'
			},
			realm: 'knot-dots',
			relation: [
				{ object: indicator.guid, position: 0, predicate: 'is-measured-by' },
				{ object: measure.guid, position: 0, predicate: 'is-part-of' }
			]
		}
	]);
});

test('an effect without a description has none in its payload', () => {
	const [effect] = newObjectiveOrEffectContainers(measure, {
		type: 'effect',
		description: ' ',
		indicator: { kind: 'existing', container: indicator },
		value: { kind: 'tendency', trendValue: 1 }
	});

	expect(effect.payload).not.toHaveProperty('description');
});

test('an effect is sent after the new indicator it refers to by its guid', () => {
	const [newIndicator, effect] = newObjectiveOrEffectContainers(measure, {
		type: 'effect',
		description: 'More people cycle.',
		indicator: {
			kind: 'new',
			container: newIndicatorForObjectiveOrEffect({
				categoryKeys: [],
				kind: 'series',
				scope: organization,
				target: measure,
				title: 'Cyclists',
				unit: 'unit.percent'
			})
		},
		value: { kind: 'series', plannedValues: [[2030, 30]], achievedValues: [[2030, 0]] }
	});

	expect(newIndicator).toMatchObject({
		guid: expect.any(String),
		payload: { title: 'Cyclists', type: 'indicator' }
	});
	expect(effect.payload).toMatchObject({ plannedValues: [[2030, 30]], title: 'Cyclists' });
	expect(effect.relation).toContainEqual({
		object: newIndicator.guid,
		position: 0,
		predicate: 'is-measured-by'
	});
});

const goal = stored('00000000-0000-4000-8000-000000000004', {
	category: { sdg: ['sdg.11'] },
	title: 'Climate-neutral mobility',
	type: 'goal'
}) as Container<GoalPayload>;

test('an objective for an existing indicator is an objective for it and part of the target', () => {
	const containers = newObjectiveOrEffectContainers(goal, {
		type: 'objective',
		description: 'Half of all trips by bike.',
		indicator: { kind: 'existing', container: indicator },
		iooiType: 'iooi.impact',
		value: { kind: 'series', wantedValues: [[2030, 20]] }
	});

	expect(containers).toEqual([
		{
			guid: expect.any(String),
			managed_by: goal.managed_by,
			organization: organizationGuid,
			organizational_unit: null,
			payload: {
				description: 'Half of all trips by bike.',
				iooiType: 'iooi.impact',
				title: 'Modal split',
				type: 'objective',
				wantedValues: [[2030, 20]]
			},
			realm: 'knot-dots',
			relation: [
				{ object: indicator.guid, position: 0, predicate: 'is-objective-for' },
				{ object: goal.guid, position: 0, predicate: 'is-part-of' }
			]
		}
	]);
});

test('an objective is sent after the new indicator it is an objective for', () => {
	const [newIndicator, objective] = newObjectiveOrEffectContainers(goal, {
		type: 'objective',
		description: '',
		indicator: {
			kind: 'new',
			container: newIndicatorForObjectiveOrEffect({
				categoryKeys: ['sdg'],
				kind: 'binary',
				scope: organization,
				target: goal,
				title: 'Mobility plan adopted'
			})
		},
		value: { kind: 'binary', booleanValue: true }
	});

	expect(newIndicator.payload).toMatchObject({
		category: { sdg: ['sdg.11'] },
		title: 'Mobility plan adopted',
		type: 'binary_indicator'
	});
	expect(objective.payload).toEqual({
		booleanValue: true,
		title: 'Mobility plan adopted',
		type: 'objective'
	});
	expect(objective.relation).toContainEqual({
		object: newIndicator.guid,
		position: 0,
		predicate: 'is-objective-for'
	});
});
