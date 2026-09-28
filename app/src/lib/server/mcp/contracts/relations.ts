import { z } from 'zod';
import { predicates } from '$lib/models';
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
	position: z.number().int().nonnegative(),
	predicate: z.string()
});

export const listContainerRelationsOutput = z.strictObject({
	nextOffset,
	relations: z.array(containerRelation)
});

export type ListContainerRelationsOutput = z.infer<typeof listContainerRelationsOutput>;
