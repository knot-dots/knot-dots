import { z } from 'zod';
import {
	backgroundColor,
	payloadTypes,
	progressMeasurement,
	progressObjectType,
	resourceDataTypes,
	visibility,
	type PayloadType
} from '$lib/models';
import { containerSummary } from '$lib/server/mcp/contracts/containers';

export const addSectionToolName = 'add_section';

const { goal, measure, organization, organizational_unit, simple_measure, task } =
	payloadTypes.enum;

// Sections that show data related to their parent instead of content of
// their own, and the parents the web application offers them for.
export const dataViewSectionParentTypes = {
	[payloadTypes.enum.administrative_area_basic_data]: [organization, organizational_unit],
	[payloadTypes.enum.demographic_data]: [organizational_unit],
	[payloadTypes.enum.effect_collection]: [goal, measure],
	[payloadTypes.enum.goal_collection]: [measure, simple_measure],
	[payloadTypes.enum.indicator_collection]: [organization, organizational_unit],
	[payloadTypes.enum.map]: [organization, organizational_unit],
	[payloadTypes.enum.measure_collection]: [measure, organization, organizational_unit],
	[payloadTypes.enum.objective_collection]: [goal],
	[payloadTypes.enum.program_collection]: [organization, organizational_unit],
	[payloadTypes.enum.progress]: [goal, measure],
	[payloadTypes.enum.resource_collection]: [measure, simple_measure],
	[payloadTypes.enum.resource_data_collection]: [goal, measure],
	[payloadTypes.enum.summary]: [
		payloadTypes.enum.event,
		goal,
		payloadTypes.enum.indicator,
		payloadTypes.enum.knowledge,
		measure,
		payloadTypes.enum.report,
		payloadTypes.enum.rule
	],
	[payloadTypes.enum.task_collection]: [goal, measure, task]
} as const satisfies Partial<Record<PayloadType, readonly PayloadType[]>>;

export type McpDataViewSectionType = keyof typeof dataViewSectionParentTypes;

// Sections with content of their own have their own tools.
const otherSectionTools: Partial<Record<string, string>> = {
	[payloadTypes.enum.custom_collection]: 'add_custom_collection_section',
	[payloadTypes.enum.text]: 'create_container'
};

export const mcpDataViewSectionTypes = z.enum(
	Object.keys(dataViewSectionParentTypes) as [McpDataViewSectionType, ...McpDataViewSectionType[]],
	{
		error: ({ input }) => {
			const tool = typeof input === 'string' ? otherSectionTools[input] : undefined;
			return tool ? `Add ${input} sections with ${tool}.` : undefined;
		}
	}
);

export function isMcpDataViewSectionType(type: PayloadType): type is McpDataViewSectionType {
	return type in dataViewSectionParentTypes;
}

// The resource data a collection shows, as the web application offers it.
const sectionResourceDataTypes = resourceDataTypes.extract([
	'resource_data_type.actual_resource_allocation',
	'resource_data_type.planned_resource_allocation',
	'resource_data_type.budget'
]);

export const addSectionInput = z
	.strictObject({
		color: backgroundColor
			.optional()
			.describe('Background color of the section; not available for effect_collection.'),
		measurement: progressMeasurement
			.optional()
			.describe(
				'For progress: manual lets people set the progress of the parent by hand (the default); subordinateObjects computes it from the status of the containers of objectType that are part of the parent.'
			),
		objectType: progressObjectType
			.optional()
			.describe(
				'For progress with measurement subordinateObjects: the type of the containers it counts. Defaults to task.'
			),
		parentGuid: z.uuid().describe('Container whose sections the new section is appended to.'),
		resourceDataType: sectionResourceDataTypes
			.optional()
			.describe(
				'Required for resource_data_collection: the actual or planned resource allocation of a measure, or the budget of a goal.'
			),
		type: mcpDataViewSectionTypes.describe('Type of the section.'),
		visibility: visibility
			.exclude([visibility.enum.public])
			.optional()
			.describe(
				'Who can see the section: its creator, the members of its team or the organization (the default). Only a person can make it public, in the web application.'
			)
	})
	.superRefine((input, context) => {
		if (
			input.type !== payloadTypes.enum.progress &&
			(input.measurement !== undefined || input.objectType !== undefined)
		) {
			context.addIssue({
				code: 'custom',
				message: 'measurement and objectType apply only to a progress section.',
				path: [input.measurement !== undefined ? 'measurement' : 'objectType']
			});
		}
		if (
			(input.type === payloadTypes.enum.resource_data_collection) !==
			(input.resourceDataType !== undefined)
		) {
			context.addIssue({
				code: 'custom',
				message: 'resourceDataType is required for a resource_data_collection, and only for it.',
				path: ['resourceDataType']
			});
		}
		if (input.type === payloadTypes.enum.effect_collection && input.color !== undefined) {
			context.addIssue({
				code: 'custom',
				message: 'An effect_collection has no background color.',
				path: ['color']
			});
		}
	});

export type AddSectionInput = z.infer<typeof addSectionInput>;

export const addSectionOutput = containerSummary.extend({ revision: z.number().int().positive() });

export type AddSectionOutput = z.infer<typeof addSectionOutput>;
