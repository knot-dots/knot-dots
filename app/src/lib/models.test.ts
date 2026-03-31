import { expect, test } from 'vitest';
import { z } from 'zod';
import {
	container,
	type EffectContainer,
	type IndicatorTemplateContainer,
	type MeasureContainer,
	payloadTypes,
	predicates,
	type ProgramContainer,
	sortIndicatorsByRelevanceForGoalOrMeasure,
	units
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
}) as IndicatorTemplateContainer;

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
}) as IndicatorTemplateContainer;

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
}) as IndicatorTemplateContainer;

const program = testContainer.parse({
	guid: 'f27b7194-1669-444a-ac0d-6380ed80e619',
	managed_by: organizationOne,
	organization: organizationOne,
	payload: {
		category: {},
		title: 'Sustainability Strategy',
		type: payloadTypes.enum.program
	}
}) as ProgramContainer;

const measure = testContainer.parse({
	guid: '306617a4-32fe-4fb7-9fef-089518a585fa',
	managed_by: organizationOne,
	organization: organizationOne,
	payload: {
		category: {},
		title: 'Reduce water consumption',
		type: payloadTypes.enum.measure
	}
}) as MeasureContainer;

const effect = testContainer.parse({
	guid: '304bd9e4-55d9-410f-93fb-38a152635b64',
	managed_by: organizationOne,
	organization: organizationOne,
	payload: {
		category: {},
		title: indicatorTemplateOne.payload.title,
		type: payloadTypes.enum.effect
	}
}) as EffectContainer;

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
	}) as MeasureContainer;

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
	}) as MeasureContainer;

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
