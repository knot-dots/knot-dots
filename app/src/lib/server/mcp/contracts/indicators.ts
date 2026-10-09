import { z } from 'zod';
import { iooiTypes } from '$lib/models';

export const attachIndicatorToolName = 'attach_indicator';

export const attachIndicatorInput = z.strictObject({
	indicatorGuid: z
		.uuid()
		.describe(
			'Indicator template or binary indicator to measure the target with; it may belong to another organization if it is visible to you, such as a public indicator template.'
		),
	iooiType: iooiTypes
		.optional()
		.describe('Optional IOOI level of the effect or objective; defaults to iooi.output.'),
	targetGuid: z
		.uuid()
		.describe('Measure, simple measure or goal whose progress the indicator should measure.')
});

export type AttachIndicatorInput = z.infer<typeof attachIndicatorInput>;

export const attachIndicatorOutput = z.strictObject({
	attachment: z.strictObject({
		guid: z.uuid().describe('GUID of the effect or objective that links target and indicator.'),
		indicatorGuid: z.uuid(),
		targetGuid: z.uuid(),
		type: z
			.enum(['effect', 'objective'])
			.describe('effect for measures and simple measures, objective for goals.')
	}),
	changed: z
		.boolean()
		.describe('False if the indicator was already attached to the target; nothing was created.')
});

export type AttachIndicatorOutput = z.infer<typeof attachIndicatorOutput>;
