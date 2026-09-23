import { z } from 'zod';
import { payloadTypes, visibility } from '$lib/models';

const title = z.string().trim().min(1).describe('Non-empty title of the new container.');

export const createPageInput = z.strictObject({
	body: z
		.string()
		.trim()
		.default('')
		.describe('Optional GitHub-flavored Markdown body of the page.'),
	organizationGuid: z.uuid().describe('Organization in which the page should be created.'),
	organizationalUnitGuid: z
		.uuid()
		.nullable()
		.default(null)
		.describe('Optional organizational unit that should own the page.'),
	title,
	visibility: visibility
		.default(visibility.enum.organization)
		.describe('Visibility of the new page; defaults to organization.')
});

export type CreatePageInput = z.infer<typeof createPageInput>;

const createdPage = z.strictObject({
	guid: z.uuid(),
	organizationGuid: z.uuid(),
	organizationalUnitGuid: z.uuid().nullable(),
	title: z.string(),
	visibility
});

export const createPageOutput = z.strictObject({ page: createdPage });

export type CreatePageOutput = z.infer<typeof createPageOutput>;

const uniqueStrings = z
	.array(z.string().trim().min(1))
	.min(1)
	.transform((values) => [...new Set(values)]);

export const addCustomCollectionSectionInput = z.strictObject({
	categories: z
		.record(z.string().trim().min(1), uniqueStrings)
		.default({})
		.describe(
			'Category keys from list_container_categories and values from list_container_category_values.'
		),
	includeSubordinateOrganizationalUnits: z
		.boolean()
		.default(true)
		.describe('Whether the collection should include subordinate organizational units.'),
	pageGuid: z.uuid().describe('Page to which the section should be appended.'),
	title,
	types: z
		.array(payloadTypes)
		.min(1)
		.transform((types) => [...new Set(types)])
		.describe('Container types that the dynamic collection should display.')
});

export type AddCustomCollectionSectionInput = z.infer<typeof addCustomCollectionSectionInput>;

const createdCustomCollectionSection = z.strictObject({
	categories: z.record(z.string(), z.array(z.string())),
	guid: z.uuid(),
	includeSubordinateOrganizationalUnits: z.boolean(),
	pageGuid: z.uuid(),
	title: z.string(),
	types: z.array(payloadTypes)
});

export const addCustomCollectionSectionOutput = z.strictObject({
	section: createdCustomCollectionSection
});

export type AddCustomCollectionSectionOutput = z.infer<typeof addCustomCollectionSectionOutput>;
