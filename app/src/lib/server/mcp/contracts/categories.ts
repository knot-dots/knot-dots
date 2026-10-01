import { z } from 'zod';
import { categoryObjectTypes, payloadTypes } from '$lib/models';
import { nextOffset, paginationInput } from '$lib/server/mcp/contracts/pagination';

export const listContainerCategoriesInput = z.strictObject({
	organizationGuid: z.uuid().describe('Organization whose categories should be listed.'),
	types: z
		.array(payloadTypes)
		.default([])
		.describe(
			'Container types to consider; categories applying to any requested type are returned.'
		)
});

export type ListContainerCategoriesInput = z.infer<typeof listContainerCategoriesInput>;

const categoryValue = z.strictObject({
	label: z.string(),
	parentValue: z
		.string()
		.nullable()
		.describe(
			'Value this one is a sub-value of, or null. Sub-values are chosen on their own and do not imply their parent value.'
		),
	value: z
		.string()
		.describe('Value to store in the payload category; the label is only for display.')
});

const containerCategory = z.strictObject({
	applicableTypes: z.array(categoryObjectTypes),
	key: z.string(),
	label: z.string(),
	valueCount: z.number().int().nonnegative()
});

export const listContainerCategoriesOutput = z.strictObject({
	categories: z.array(containerCategory)
});

export type ListContainerCategoriesOutput = z.infer<typeof listContainerCategoriesOutput>;

export const listContainerCategoryValuesInput = z.strictObject({
	categoryKey: z
		.string()
		.trim()
		.min(1)
		.describe('Category key returned by list_container_categories.'),
	...paginationInput('values'),
	organizationGuid: z.uuid().describe('Organization whose category values should be listed.'),
	terms: z
		.string()
		.trim()
		.min(1)
		.max(200)
		.optional()
		.describe('Optional case-insensitive label or value search.'),
	types: z
		.array(payloadTypes)
		.default([])
		.describe('Container types to consider; the category may apply to any requested type.')
});

export type ListContainerCategoryValuesInput = z.infer<typeof listContainerCategoryValuesInput>;

export const listContainerCategoryValuesOutput = z.strictObject({
	category: z.strictObject({ key: z.string(), label: z.string() }),
	nextOffset,
	values: z.array(categoryValue)
});

export type ListContainerCategoryValuesOutput = z.infer<typeof listContainerCategoryValuesOutput>;
