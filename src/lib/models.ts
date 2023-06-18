import { Cog8Tooth, Flag, LightBulb, Pencil } from 'svelte-hero-icons';
import type { IconSource } from 'svelte-hero-icons';
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

const levelValues = [
	'level.global',
	'level.multi_lateral',
	'level.national',
	'level.state',
	'level.regional',
	'level.local'
] as const;

export const levels = z.enum(levelValues);

export type Level = z.infer<typeof levels>;

export function isLevel(value: unknown): value is Level {
	return levelValues.includes(value as Level);
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
	'status.in_operation'
] as const;

export const status = z.enum(statusValues);

export const statusColors = new Map<Status, string>([
	[status.enum['status.idea'], 'red'],
	[status.enum['status.in_planning'], 'orange'],
	[status.enum['status.in_implementation'], 'yellow'],
	[status.enum['status.in_operation'], 'green']
]);

export const statusIcons = new Map<Status, IconSource>([
	[status.enum['status.idea'], LightBulb],
	[status.enum['status.in_planning'], Pencil],
	[status.enum['status.in_implementation'], Cog8Tooth],
	[status.enum['status.in_operation'], Flag]
]);

export type Status = z.infer<typeof status>;

export function isStatus(value: unknown): value is Status {
	return statusValues.includes(value as Status);
}

const strategyTypeValues = [
	'strategy_type.mobility',
	'strategy_type.sustainability',
	'strategy_type.smart_city',
	'strategy_type.isek'
] as const;

export const strategyTypes = z.enum(strategyTypeValues);

export type StrategyType = z.infer<typeof strategyTypes>;

export function isStrategyType(value: unknown): value is StrategyType {
	return strategyTypeValues.includes(value as StrategyType);
}

const topicValues = [
	'topic.economy',
	'topic.health',
	'topic.mobility',
	'topic.living',
	'topic.environment',
	'topic.education_and_culture',
	'topic.social_justice',
	'topic.digital_municipality',
	'topic.demographics',
	'topic.cityscape',
	'topic.citizen_participation',
	'topic.security'
] as const;

export const topics = z.enum(topicValues);

export type topic = z.infer<typeof topics>;

export function isTopic(value: unknown): value is topic {
	return topicValues.includes(value as topic);
}

const quantityValues = [
	'quantity.co2',
	'quantity.cycle_path',
	'quantity.parking_space',
	'quantity.solar_energy'
] as const;

export const quantities = z.enum(quantityValues);

export type Quantity = z.infer<typeof quantities>;

export function isQuantity(value: unknown): value is Quantity {
	return quantityValues.includes(value as Quantity);
}

const unitValues = ['unit.kilowatt_hour', 'unit.kilometer', 'unit.ton'] as const;

export const units = z.enum(unitValues);

export type Unit = z.infer<typeof units>;

export function isUnit(value: unknown): value is Unit {
	return unitValues.includes(value as Unit);
}

export const unitByQuantity = new Map<Quantity, Unit>([
	[quantities.enum['quantity.co2'], units.enum['unit.ton']],
	[quantities.enum['quantity.cycle_path'], units.enum['unit.kilometer']],
	[quantities.enum['quantity.solar_energy'], units.enum['unit.kilowatt_hour']]
]);

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

const indicator = z.object({
	max: z.coerce.number().nonnegative(),
	min: z.coerce.number().nonnegative(),
	quantity: z.string().optional(),
	fulfillmentDate: z
		.string()
		.refine((v) => z.coerce.date().safeParse(v))
		.optional(),
	value: z.number().nonnegative().optional()
});

export type Indicator = z.infer<typeof indicator>;

const basePayload = z
	.object({
		category: sustainableDevelopmentGoals,
		description: z.string(),
		summary: z.string().max(200).optional(),
		title: z.string()
	})
	.strict();

const measurePayload = basePayload
	.extend({
		indicatorContribution: z.record(z.string().uuid(), z.coerce.number().nonnegative()).optional(),
		status: status
	})
	.strict();

const operationalGoalPayload = basePayload
	.extend({
		indicator: z.array(indicator).max(1)
	})
	.strict();

const strategyPayload = basePayload
	.extend({
		level: levels,
		strategyType: strategyTypes,
		topic: topics
	})
	.strict();

export const container = z.object({
	guid: z.string().uuid(),
	type: containerTypes,
	payload: z.union([basePayload, measurePayload, operationalGoalPayload, strategyPayload]),
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
