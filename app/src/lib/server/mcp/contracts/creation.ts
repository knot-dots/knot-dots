import { z } from 'zod';
import { payloadTypes, predicates, type PayloadType, type Predicate } from '$lib/models';
import { containerSummary, getContainerOutput } from '$lib/server/mcp/contracts/containers';
import { mcpPayloadTypes } from '$lib/server/mcp/contracts/payloads';
import {
	mcpRelationPredicateMeanings,
	mcpRelationPredicateValues
} from '$lib/server/mcp/contracts/relations';

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
	predicates.enum['is-part-of-category'],
	predicates.enum['is-part-of-program'],
	predicates.enum['is-part-of-measure'],
	predicates.enum['is-section-of']
]);

export type McpParentRelationPredicate = z.infer<typeof mcpParentRelationPredicates>;

const parentRelationPredicate = mcpParentRelationPredicates.describe(
	`Structural relation from the new container to the parent. is-part-of-program makes a goal, measure, simple measure, knowledge or rule part of a program, and also a section of it, which shows it in the program; other types cannot be part of a program. is-part-of-measure needs a measure or simple measure. is-part-of places a goal below a goal, a measure, simple measure or task below a goal or measure, knowledge below knowledge, an effect below a measure or simple measure, and an objective below a goal. A term, a value of a category, is either part of a category (is-part-of-category) or below a term that is (is-part-of); categories take no parent. is-section-of adds a text section to a container of type ${mcpSectionParentTypes.join(', ')}; a section of an organizational unit belongs to that unit. The server assigns the position, which is the sort order among the children of the parent.`
);

function uniqueBy<T>(key: (value: T) => string, message: string) {
	return (values: T[], context: z.RefinementCtx) => {
		const seen = new Set<string>();
		for (const [index, value] of values.entries()) {
			if (seen.has(key(value))) {
				context.addIssue({ code: 'custom', message, path: [index] });
			}
			seen.add(key(value));
		}
	};
}

function parentRelationsOf(parentGuidDescription: string) {
	return z
		.array(
			z.strictObject({
				parentGuid: z.uuid().describe(parentGuidDescription),
				predicate: parentRelationPredicate
			})
		)
		.max(20)
		.superRefine(
			uniqueBy(
				({ parentGuid, predicate }) => `${parentGuid}:${predicate}`,
				'Parent relations must be unique.'
			)
		)
		.default([]);
}

const organizationalUnitGuid = z
	.uuid()
	.nullable()
	.default(null)
	.describe(
		'Organizational unit that should own the container. With parent relations, the container belongs to the unit of its parents; omit it or pass that unit.'
	);

const payload = z
	.looseObject({ type: mcpPayloadTypes })
	.describe('Complete payload matching the resource at knotdots://schemas/payloads/{type}.');

export const createContainerInput = z.strictObject({
	organizationGuid: z.uuid().describe('Organization in which the container should be created.'),
	organizationalUnitGuid,
	parentRelations: parentRelationsOf(
		'GUID of an existing parent container that is visible to you in the same organization.'
	),
	payload
});

export type CreateContainerInput = z.infer<typeof createContainerInput>;

export const createContainerOutput = getContainerOutput;

export type CreateContainerOutput = z.infer<typeof createContainerOutput>;

export const createContainersToolName = 'create_containers';

// As many containers as the bulk creation of the web application takes in one
// request.
export const maxContainersPerCall = 20;

const indicatorLinkPredicateValues = [
	predicates.enum['is-measured-by'],
	predicates.enum['is-objective-for']
] as const satisfies readonly Predicate[];

export const mcpNewContainerRelationPredicates = z.enum(
	[...mcpRelationPredicateValues, ...indicatorLinkPredicateValues],
	{
		error: ({ input }) =>
			typeof input === 'string' && mcpParentRelationPredicates.safeParse(input).success
				? `${input} is a structural relation; set it with parentRelations.`
				: `Only these relations can be set here: ${[...mcpRelationPredicateValues, ...indicatorLinkPredicateValues].join(', ')}.`
	}
);

const newContainerRelation = z.strictObject({
	objectGuid: z
		.uuid()
		.describe(
			'Container the relation points to: an existing container visible to you in the organization, or another container of this call.'
		),
	predicate: mcpNewContainerRelationPredicates.describe(
		[
			'The relation reads as "new container predicate object":',
			...mcpRelationPredicateMeanings,
			'is-measured-by: the new effect is measured by an indicator or binary indicator created in this call;',
			'is-objective-for: the new objective is the objective for such an indicator.',
			'To link an existing indicator, use attach_indicator.'
		].join(' ')
	)
});

const newContainerOfCall = z.strictObject({
	guid: z
		.uuid()
		.describe(
			'GUID you choose for the new container: a random UUID that is not in use yet. The container keeps it, and other containers of this call refer to the container by it.'
		),
	organizationalUnitGuid,
	parentRelations: parentRelationsOf(
		'GUID of the parent: an existing container visible to you in the organization, or a container listed earlier in this call.'
	),
	payload,
	relations: z
		.array(newContainerRelation)
		.max(20)
		.superRefine(
			uniqueBy(
				({ objectGuid, predicate }) => `${objectGuid}:${predicate}`,
				'Relations must be unique.'
			)
		)
		.default([])
		.describe('Semantic relations from the new container to other containers.')
});

export const createContainersInput = z.strictObject({
	containers: z
		.array(newContainerOfCall)
		.min(1)
		.max(maxContainersPerCall)
		.superRefine(uniqueBy(({ guid }) => guid, 'The GUIDs of the containers must be unique.'))
		.describe(
			'Containers to create, parents before their children. Containers with the same parent are appended to it in this order.'
		),
	organizationGuid: z.uuid().describe('Organization in which the containers should be created.')
});

export type CreateContainersInput = z.infer<typeof createContainersInput>;

export const createContainersOutput = z.strictObject({
	containers: z
		.array(
			containerSummary.extend({
				revision: z
					.number()
					.int()
					.positive()
					.describe('Pass as expectedRevision to update_container.')
			})
		)
		.describe('The created containers, in the order they were given.')
});

export type CreateContainersOutput = z.infer<typeof createContainersOutput>;
