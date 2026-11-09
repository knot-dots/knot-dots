import { z } from 'zod';
import { payloadTypes, predicates, type PayloadType } from '$lib/models';
import { getContainerOutput } from '$lib/server/mcp/contracts/containers';
import { mcpPayloadTypes } from '$lib/server/mcp/contracts/payloads';

export const createContainerToolName = 'create_container';

// Containers whose detail view in the web application shows sections, where
// sections can be added through MCP as well.
export const mcpSectionParentTypes = [
	payloadTypes.enum.event,
	payloadTypes.enum.goal,
	payloadTypes.enum.help,
	payloadTypes.enum.indicator,
	payloadTypes.enum.knowledge,
	payloadTypes.enum.measure,
	payloadTypes.enum.organization,
	payloadTypes.enum.organizational_unit,
	payloadTypes.enum.page,
	payloadTypes.enum.post,
	payloadTypes.enum.program,
	payloadTypes.enum.report,
	payloadTypes.enum.resource_data,
	payloadTypes.enum.resource_v2,
	payloadTypes.enum.rule,
	payloadTypes.enum.simple_measure,
	payloadTypes.enum.task,
	payloadTypes.enum.teaser
] as const satisfies readonly PayloadType[];

export const mcpParentRelationPredicates = z.enum([
	predicates.enum['is-part-of'],
	predicates.enum['is-part-of-program'],
	predicates.enum['is-part-of-measure'],
	predicates.enum['is-section-of']
]);

export type McpParentRelationPredicate = z.infer<typeof mcpParentRelationPredicates>;

const parentRelation = z.strictObject({
	parentGuid: z
		.uuid()
		.describe(
			'GUID of an existing parent container that is visible to you in the same organization.'
		),
	predicate: mcpParentRelationPredicates.describe(
		`Structural relation from the new container to the parent. is-part-of-program makes a goal, measure, simple measure, knowledge or rule part of a program, and also a section of it, which shows it in the program; other types cannot be part of a program. is-part-of-measure needs a measure or simple measure. is-part-of places a goal below a goal, a measure, simple measure or task below a goal or measure, knowledge below knowledge, an effect below a measure or simple measure, and an objective below a goal. is-section-of adds a text section to a container of type ${mcpSectionParentTypes.join(', ')}; a section of an organizational unit belongs to that unit. The server assigns the position, which is the sort order among the children of the parent.`
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
		.describe(
			'Organizational unit that should own the container. With parent relations, the container belongs to the unit of its parents; omit it or pass that unit.'
		),
	parentRelations,
	payload: z
		.looseObject({ type: mcpPayloadTypes })
		.describe('Complete payload matching the resource at knotdots://schemas/payloads/{type}.')
});

export type CreateContainerInput = z.infer<typeof createContainerInput>;

export const createContainerOutput = getContainerOutput;

export type CreateContainerOutput = z.infer<typeof createContainerOutput>;
