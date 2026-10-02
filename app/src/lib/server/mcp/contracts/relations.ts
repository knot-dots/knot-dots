import { z } from 'zod';
import { predicates, type Predicate } from '$lib/models';
import { containerSummary } from '$lib/server/mcp/contracts/containers';
import { nextOffset, paginationInput } from '$lib/server/mcp/contracts/pagination';

export const listContainerRelationsInput = z.strictObject({
	guid: z.uuid().describe('Container whose direct relations should be listed.'),
	...paginationInput('relations'),
	predicates: z
		.array(predicates)
		.default([])
		.describe('Relation predicates to include; empty includes every predicate.')
});

export type ListContainerRelationsInput = z.infer<typeof listContainerRelationsInput>;

const containerRelation = z.strictObject({
	container: containerSummary.describe('The container at the other end of the relation.'),
	direction: z
		.enum(['incoming', 'outgoing'])
		.describe(
			'outgoing: the listed container is the subject ("listed predicate container"); incoming: it is the object ("container predicate listed").'
		),
	position: z
		.number()
		.int()
		.nonnegative()
		.describe(
			'Sort order among the children of the object for structural relations such as is-part-of-program; always 0 for semantic relations.'
		),
	predicate: z.string()
});

export const listContainerRelationsOutput = z.strictObject({
	nextOffset,
	relations: z.array(containerRelation)
});

export type ListContainerRelationsOutput = z.infer<typeof listContainerRelationsOutput>;

export const addContainerRelationToolName = 'add_container_relation';
export const removeContainerRelationToolName = 'remove_container_relation';

// Semantic relations as offered by the relation overlay of the web
// application. Structural relations such as is-part-of move containers and
// change permissions, so they are not changed through these tools.
export const mcpRelationPredicateValues = [
	predicates.enum['contributes-to'],
	predicates.enum['is-concrete-target-of'],
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-prerequisite-for'],
	predicates.enum['is-sub-target-of'],
	predicates.enum['is-superordinate-of']
] as const satisfies readonly Predicate[];

export const mcpRelationPredicates = z.enum(mcpRelationPredicateValues);

export type McpRelationPredicate = z.infer<typeof mcpRelationPredicates>;

// Relations that hold in both directions; the stored direction is irrelevant.
export const symmetricMcpRelationPredicates: ReadonlySet<string> = new Set<McpRelationPredicate>([
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with']
]);

export const containerRelationChangeInput = z.strictObject({
	objectGuid: z.uuid().describe('Container the relation points to.'),
	predicate: mcpRelationPredicates.describe(
		[
			'The relation reads as "subject predicate object":',
			'contributes-to: the subject contributes to the object;',
			'is-concrete-target-of: the subject is a concrete target of the object;',
			'is-prerequisite-for: the subject is a prerequisite for the object;',
			'is-sub-target-of: the subject is a sub-target of the object;',
			'is-superordinate-of: the subject is superordinate to the object;',
			'is-consistent-with, is-inconsistent-with and is-equivalent-to hold in both directions.'
		].join(' ')
	),
	subjectGuid: z.uuid().describe('Container the relation starts from.')
});

export type ContainerRelationChangeInput = z.infer<typeof containerRelationChangeInput>;

export const containerRelationChangeOutput = z.strictObject({
	changed: z
		.boolean()
		.describe(
			'False if nothing had to change: the relation already existed or was already absent.'
		),
	relation: z
		.strictObject({ objectGuid: z.uuid(), predicate: z.string(), subjectGuid: z.uuid() })
		.describe('The relation as stored; symmetric relations may be stored in the other direction.')
});

export type ContainerRelationChangeOutput = z.infer<typeof containerRelationChangeOutput>;
