import { z } from 'zod';
import { createContainerSchema, payloadTypes, status } from '$lib/models';
import { nextOffset, paginationInput } from '$lib/server/mcp/contracts/pagination';

export const containerSummary = z.strictObject({
	assigneeGuids: z.array(z.uuid()),
	creatorGuids: z.array(z.uuid()),
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

// The payload stays loose: its schema is published per type as a resource, and
// the payload schemas' transforms cannot be represented as output JSON Schema.
// managed_by and valid_from are overridden for the same reason.
const serializedContainer = createContainerSchema(z.looseObject({ type: payloadTypes })).extend({
	managed_by: z.array(z.uuid()).nonempty(),
	valid_from: z.iso.datetime()
});

export const getContainerOutput = z.strictObject({ container: serializedContainer });

export type GetContainerOutput = z.infer<typeof getContainerOutput>;

export const searchContainersInput = z.strictObject({
	assigneeGuids: z
		.array(z.uuid())
		.default([])
		.describe('Allowed assignee user GUIDs; empty matches every assignee.'),
	...paginationInput('containers'),
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
	nextOffset
});

export type SearchContainersOutput = z.infer<typeof searchContainersOutput>;
