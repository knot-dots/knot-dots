import { expect, test } from 'vitest';
import {
	effectKindOptions,
	effectValuePayload,
	newEffectContainers,
	newIndicatorForEffect
} from '$lib/effectCreation';
import {
	anyContainer,
	composeUserGrants,
	type Container,
	grantSetForRole,
	type IndicatorPayload,
	type MeasurePayload,
	memberRoles
} from '$lib/models';

test.each([
	[undefined, ['IOOI'], true, ['tendency', 'series', 'binary']],
	[undefined, ['IOOI'], false, ['tendency', 'series']],
	[undefined, [], true, ['series']],
	['indicator', ['IOOI'], true, ['tendency', 'series']],
	['indicator', [], true, ['series']],
	['binary_indicator', ['IOOI'], false, ['binary']],
	['binary_indicator', [], false, []]
] as const)(
	'effects for indicator type %s with features %j and binary creation %s',
	(indicatorType, features, mayCreateBinaryIndicator, expected) => {
		expect(
			effectKindOptions({ features: [...features], indicatorType, mayCreateBinaryIndicator })
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
			]
		})
	).toEqual({
		achievedValues: [
			[2026, 0],
			[2030, 0]
		],
		plannedValues: [
			[2026, 10],
			[2030, 50]
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
	const indicator = newIndicatorForEffect({
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
	const indicator = newIndicatorForEffect({
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
	const containers = newEffectContainers(measure, {
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

test('an effect is sent after the new indicator it refers to by its guid', () => {
	const [newIndicator, effect] = newEffectContainers(measure, {
		description: 'More people cycle.',
		indicator: {
			kind: 'new',
			container: newIndicatorForEffect({
				categoryKeys: [],
				kind: 'series',
				scope: organization,
				target: measure,
				title: 'Cyclists',
				unit: 'unit.percent'
			})
		},
		value: { kind: 'series', plannedValues: [[2030, 30]] }
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
