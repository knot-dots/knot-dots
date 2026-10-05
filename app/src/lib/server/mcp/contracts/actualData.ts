import { z } from 'zod';

export const setActualDataToolName = 'set_actual_data';

const yearValue = z.strictObject({
	value: z.number(),
	year: z.number().int().positive()
});

export const setActualDataInput = z.strictObject({
	booleanValue: z
		.boolean()
		.optional()
		.describe('Whether a binary indicator is fulfilled; only for binary indicators.'),
	indicatorGuid: z
		.uuid()
		.describe(
			'Indicator template or binary indicator the values belong to; it may belong to another organization if it is visible to you.'
		),
	organizationGuid: z.uuid().describe('Organization the actual values are recorded for.'),
	organizationalUnitGuid: z
		.uuid()
		.nullable()
		.default(null)
		.describe(
			'Organizational unit the actual values are recorded for; null records them for the organization itself.'
		),
	source: z.string().trim().min(1).optional().describe('Optional source of the values.'),
	values: z
		.array(yearValue)
		.max(200)
		.default([])
		.describe(
			'Actual values by year for an indicator template. Values of other years are kept; a given year replaces its stored value.'
		)
});

export type SetActualDataInput = z.infer<typeof setActualDataInput>;

export const setActualDataOutput = z.strictObject({
	actualData: z.strictObject({
		booleanValue: z.boolean(),
		guid: z.uuid(),
		indicatorGuid: z.uuid(),
		organizationGuid: z.uuid(),
		organizationalUnitGuid: z.uuid().nullable(),
		source: z.string().nullable(),
		values: z.array(yearValue).describe('All actual values after the change, by year.')
	}),
	created: z.boolean().describe('True if the actual values were recorded for the first time.')
});

export type SetActualDataOutput = z.infer<typeof setActualDataOutput>;
