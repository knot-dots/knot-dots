import { z } from 'zod';

const sdgValues = [
	'sdg.01',
	'sdg.02',
	'sdg.03',
	'sdg.04',
	'sdg.05',
	'sdg.06',
	'sdg.07',
	'sdg.08',
	'sdg.09',
	'sdg.10',
	'sdg.11',
	'sdg.12',
	'sdg.13',
	'sdg.14',
	'sdg.15',
	'sdg.16',
	'sdg.17'
] as const;

export const sustainableDevelopmentGoals = z.enum(sdgValues);

export type SustainableDevelopmentGoal = z.infer<typeof sustainableDevelopmentGoals>;

export function isSustainableDevelopmentGoal(value: unknown): value is SustainableDevelopmentGoal {
	return sdgValues.includes(value as SustainableDevelopmentGoal);
}

const containerTypeValues = [
	'measure',
	'model',
	'operational_goal',
	'strategic_goal',
	'strategy'
] as const;

export const containerTypes = z.enum(containerTypeValues);

export type ContainerType = z.infer<typeof containerTypes>;

export function isContainerType(value: unknown): value is ContainerType {
	return containerTypeValues.includes(value as ContainerType);
}

const predicateValues = ['is-part-of'] as const;

export const predicates = z.enum(predicateValues);

export type Predicate = z.infer<typeof predicates>;

export function isPredicate(value: unknown): value is Predicate {
	return predicateValues.includes(value as Predicate);
}

const statusValues = [
	'status.idea',
	'status.in_planning',
	'status.in_implementation',
	'status.in_operation',
	'status.terminated'
] as const;

export const status = z.enum(statusValues);

export type Status = z.infer<typeof status>;

export function isStatus(value: unknown): value is Status {
	return statusValues.includes(value as Status);
}

const quantityValues = ['quantity.co2', 'quantity.cycle_path'] as const;

export const quantities = z.enum(quantityValues);

export type Quantity = z.infer<typeof quantities>;

export function isQuantity(value: unknown): value is Quantity {
	return quantityValues.includes(value as Quantity);
}

export const relation = z.object({
	object: z.number().int().positive(),
	predicate: z.string().max(128),
	subject: z.number().int().positive()
});

export type Relation = z.infer<typeof relation>;

const partialRelation = z.union([
	relation.partial({ object: true }),
	relation.partial({ subject: true })
]);

export type PartialRelation = z.infer<typeof partialRelation>;

export const user = z.object({
	issuer: z.string().url().max(1024),
	subject: z.string().uuid()
});

export type User = z.infer<typeof user>;

export const container = z.object({
	guid: z.string().uuid(),
	type: containerTypes,
	payload: z.union([
		z
			.object({
				category: sustainableDevelopmentGoals,
				description: z.string(),
				summary: z.string().max(200).optional(),
				title: z.string()
			})
			.strict(),
		z
			.object({
				category: sustainableDevelopmentGoals,
				description: z.string(),
				status: status,
				summary: z.string().max(200).optional(),
				title: z.string()
			})
			.strict()
	]),
	realm: z.string().max(1024),
	relation: z.array(relation),
	revision: z.number().int().positive(),
	user: z.array(user),
	valid_currently: z.boolean(),
	valid_from: z.number().int()
});

export type Container = z.infer<typeof container>;

export const newContainer = container
	.omit({
		guid: true,
		revision: true,
		valid_currently: true,
		valid_from: true
	})
	.extend({
		relation: z.array(partialRelation)
	});

export type NewContainer = z.infer<typeof newContainer>;

export const modifiedContainer = container
	.omit({
		revision: true,
		valid_currently: true,
		valid_from: true
	})
	.extend({
		relation: z.array(partialRelation)
	});

export type ModifiedContainer = z.infer<typeof modifiedContainer>;
