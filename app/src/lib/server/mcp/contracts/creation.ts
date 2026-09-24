import { z } from 'zod';
import { payloadTypes, predicates } from '$lib/models';
import { getContainerOutput } from '$lib/server/mcp/contracts/containers';
import { mcpPayloadTypes } from '$lib/server/mcp/contracts/payloads';

const title = z.string().trim().min(1).describe('Non-empty title of the new container.');

export const mcpParentRelationPredicates = z.enum([
	predicates.enum['is-part-of'],
	predicates.enum['is-part-of-program'],
	predicates.enum['is-part-of-measure']
]);

const parentRelation = z.strictObject({
	parentGuid: z.uuid().describe('GUID of the existing visible parent container.'),
	predicate: mcpParentRelationPredicates.describe(
		'Structural relation from the new container to the parent.'
	)
});

const parentRelations = z
	.array(parentRelation)
	.max(20)
	.superRefine((relations, context) => {
		const seen = new Set<string>();
		for (const [index, relation] of relations.entries()) {
			const key = `${relation.parentGuid}:${relation.predicate}`;
			if (seen.has(key)) {
				context.addIssue({
					code: 'custom',
					message: 'Parent relations must be unique.',
					path: [index]
				});
			}
			seen.add(key);
		}
	})
	.default([]);

export const createContainerInput = z.strictObject({
	organizationGuid: z.uuid().describe('Organization in which the container should be created.'),
	organizationalUnitGuid: z
		.uuid()
		.nullable()
		.default(null)
		.describe('Optional organizational unit that should own the container.'),
	parentRelations,
	payload: z
		.looseObject({ type: mcpPayloadTypes })
		.describe('Complete payload matching the resource at knotdots://schemas/payloads/{type}.')
});

export type CreateContainerInput = z.infer<typeof createContainerInput>;

export const createContainerOutput = getContainerOutput;

export type CreateContainerOutput = z.infer<typeof createContainerOutput>;

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
