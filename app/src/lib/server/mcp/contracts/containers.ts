import { z } from 'zod';
import { payloadTypes, relation, status, userRelation } from '$lib/models';

export const containerSummary = z.strictObject({
	guid: z.uuid(),
	label: z.string().nullable(),
	organizationGuid: z.uuid(),
	organizationalUnitGuid: z.uuid().nullable(),
	status: status.nullable(),
	summary: z.string().nullable(),
	type: payloadTypes
});

export type ContainerSummary = z.infer<typeof containerSummary>;

export const getContainerInput = z.strictObject({
	guid: z.uuid().describe('GUID of the container to retrieve.')
});

const serializedContainer = z.looseObject({
	computed_managed_by: z.array(z.uuid()).optional(),
	guid: z.uuid(),
	managed_by: z.array(z.uuid()).nonempty(),
	organization: z.uuid(),
	organizational_unit: z.uuid().nullable(),
	payload: z.looseObject({ type: payloadTypes }),
	realm: z.string(),
	relation: z.array(relation),
	revision: z.number().int().positive(),
	user: z.array(userRelation),
	valid_currently: z.boolean(),
	valid_from: z.iso.datetime()
});

export const getContainerOutput = z.strictObject({ container: serializedContainer });

export type GetContainerOutput = z.infer<typeof getContainerOutput>;

export const searchContainersInput = z.strictObject({
	assigneeGuids: z
		.array(z.uuid())
		.default([])
		.describe('Allowed assignee user GUIDs; empty matches every assignee.'),
	limit: z.number().int().min(1).max(100).default(50).describe('Maximum number of results.'),
	offset: z
		.number()
		.int()
		.nonnegative()
		.default(0)
		.describe('Offset within the visible result set.'),
	organizationGuid: z.uuid().describe('Organization whose containers should be searched.'),
	organizationalUnitGuid: z
		.uuid()
		.nullable()
		.optional()
		.describe(
			'Omit to search every organizational unit, use null for organization-level containers, or provide a unit GUID.'
		),
	statuses: z.array(status).default([]).describe('Allowed statuses; empty matches every status.'),
	terms: z
		.string()
		.trim()
		.min(1)
		.max(200)
		.optional()
		.describe('Full-text search terms. Results are relevance-sorted when provided.'),
	types: z
		.array(payloadTypes)
		.default([])
		.describe('Allowed payload types; empty matches every payload type.')
});

export type SearchContainersInput = z.infer<typeof searchContainersInput>;

export const searchContainersOutput = z.strictObject({
	containers: z.array(containerSummary),
	nextOffset: z.number().int().nonnegative().nullable()
});

export type SearchContainersOutput = z.infer<typeof searchContainersOutput>;
