import { z } from 'zod';
import { customCollectionPayload, payloadTypes } from '$lib/models';
import { mcpSectionParentTypes } from '$lib/server/mcp/contracts/creation';

export const addCustomCollectionSectionToolName = 'add_custom_collection_section';
export const updateCustomCollectionSectionToolName = 'update_custom_collection_section';

function deduplicate<T>(values: T[]) {
	return [...new Set(values)];
}

const title = z.string().trim().min(1).describe('Title shown above the collection.');

function items(minimum: number) {
	return z
		.array(z.uuid())
		.min(minimum)
		.transform(deduplicate)
		.describe('Containers the collection shows, in this order, instead of following a filter.');
}

// The settings both tools take, each of them optional.
const sectionSettings = {
	allowSearch: z.boolean().optional().describe('Whether viewers can search the collection.'),
	allowSort: z.boolean().optional().describe('Whether viewers can change the sort order.'),
	categories: z
		.record(
			z.string().trim().min(1),
			z.array(z.string().trim().min(1)).min(1).transform(deduplicate)
		)
		.optional()
		.describe(
			'Category filter of a collection that follows a filter: category keys from list_container_categories mapped to values from list_container_category_values.'
		),
	description: z
		.string()
		.optional()
		.describe('GitHub-flavored Markdown shown below the title if showDescription is true.'),
	includeSubordinateOrganizationalUnits: z
		.boolean()
		.optional()
		.describe(
			'For a collection that follows a filter: true shows content of the organization the collection is viewed in, including its organizational units; false only content that belongs to no organizational unit. Defaults to true.'
		),
	items: items(0).optional(),
	listType: customCollectionPayload.shape.listType
		.unwrap()
		.optional()
		.describe('wall shows cards in a grid, carousel in a row, timeline along their dates.'),
	showDescription: z.boolean().optional().describe('Whether the description is shown.'),
	sort: customCollectionPayload.shape.sort
		.unwrap()
		.exclude(['relevance'])
		.optional()
		.describe('alpha sorts by title, date by date, modified by the latest change.'),
	title: title.optional(),
	types: z
		.array(payloadTypes)
		.min(1)
		.transform(deduplicate)
		.optional()
		.describe('Container types that a collection following a filter shows.')
};

export const addCustomCollectionSectionInput = z
	.strictObject({
		...sectionSettings,
		items: items(1).optional(),
		parentGuid: z
			.uuid()
			.describe(
				`Container whose sections the collection is appended to, of type ${mcpSectionParentTypes.join(', ')}.`
			),
		title
	})
	.superRefine((input, context) => {
		if ((input.types === undefined) === (input.items === undefined)) {
			context.addIssue({
				code: 'custom',
				message:
					'Give either types for a collection that follows a filter or items for a fixed selection.',
				path: ['types']
			});
		}
		if (
			input.items !== undefined &&
			(input.categories !== undefined || input.includeSubordinateOrganizationalUnits !== undefined)
		) {
			context.addIssue({
				code: 'custom',
				message:
					'categories and includeSubordinateOrganizationalUnits apply only to a collection that follows a filter.',
				path: ['items']
			});
		}
	});

export type AddCustomCollectionSectionInput = z.infer<typeof addCustomCollectionSectionInput>;

export const updateCustomCollectionSectionInput = z
	.strictObject({
		...sectionSettings,
		expectedRevision: z
			.number()
			.int()
			.positive()
			.describe(
				'Revision from the latest add_custom_collection_section, update_custom_collection_section or get_container response; the update fails if the section changed since.'
			),
		guid: z.uuid().describe('GUID of the custom collection section to change.')
	})
	.refine(
		(input) =>
			Object.keys(sectionSettings).some(
				(key) => input[key as keyof typeof sectionSettings] !== undefined
			),
		'Change at least one setting.'
	)
	.refine(
		(input) =>
			!input.items?.length ||
			(input.types === undefined &&
				input.categories === undefined &&
				input.includeSubordinateOrganizationalUnits === undefined),
		{
			message:
				'Give either filter settings (types, categories, includeSubordinateOrganizationalUnits) or items, not both.',
			path: ['items']
		}
	);

export type UpdateCustomCollectionSectionInput = z.infer<typeof updateCustomCollectionSectionInput>;

const organizationScope = z
	.discriminatedUnion('type', [
		z.strictObject({
			includeSubordinateOrganizationalUnits: z.boolean(),
			type: z.literal('current')
		}),
		z.strictObject({
			organizationalUnits: z.array(z.string()),
			organizations: z.array(z.string()),
			type: z.literal('explicit')
		})
	])
	.describe(
		'Whose content a collection following a filter shows. current: the organization it is viewed in, with or without its organizational units. explicit: organizations and organizational units chosen in the web application.'
	);

export const customCollectionSection = z.strictObject({
	additionalFilters: z
		.record(z.string(), z.array(z.string()))
		.describe(
			'Filters chosen in the web application that these tools leave as they are, such as status or program type.'
		),
	allowSearch: z.boolean(),
	allowSort: z.boolean(),
	categories: z.record(z.string(), z.array(z.string())),
	description: z.string().nullable(),
	guid: z.uuid(),
	items: z
		.array(z.uuid())
		.describe('Containers shown in this order; if empty, the collection follows its filter.'),
	listType: z.string(),
	mode: z
		.enum(['filter', 'items'])
		.describe(
			'filter: the collection shows what types, categories, organizationScope and additionalFilters select. items: it shows items in this order, and the filter is kept for a later switch back.'
		),
	organizationScope,
	parentGuid: z.uuid().nullable().describe('Container the collection is a section of.'),
	revision: z
		.number()
		.int()
		.positive()
		.describe('Pass as expectedRevision to update_custom_collection_section.'),
	showDescription: z.boolean(),
	sort: z.string(),
	title: z.string(),
	types: z
		.array(z.string())
		.describe(
			'Container types the filter selects; if empty, the default types of the web application apply.'
		)
});

export type CustomCollectionSection = z.infer<typeof customCollectionSection>;

export const customCollectionSectionOutput = z.strictObject({ section: customCollectionSection });

export type CustomCollectionSectionOutput = z.infer<typeof customCollectionSectionOutput>;
