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

const payloadTypeValues = [
	'measure',
	'model',
	'operational_goal',
	'strategic_goal',
	'strategy'
] as const;

export const payloadTypes = z.enum(payloadTypeValues);

export type PayloadType = z.infer<typeof payloadTypes>;

export function isPayloadType(value: unknown): value is PayloadType {
	return payloadTypeValues.includes(value as PayloadType);
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

export type Topic = z.infer<typeof topics>;

export function isTopic(value: unknown): value is Topic {
	return topicValues.includes(value as Topic);
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
		status: status,
		type: z.literal(payloadTypes.enum.measure)
	})
	.strict();

const modelPayload = basePayload
	.extend({
		type: z.literal(payloadTypes.enum.model)
	})
	.strict();

const operationalGoalPayload = basePayload
	.extend({
		indicator: z.array(indicator).max(1),
		type: z.literal(payloadTypes.enum.operational_goal)
	})
	.strict();

const strategicGoalPayload = basePayload
	.extend({
		type: z.literal(payloadTypes.enum.strategic_goal)
	})
	.strict();

const strategyPayload = basePayload
	.extend({
		level: levels,
		strategyType: strategyTypes,
		topic: topics,
		type: z.literal(payloadTypes.enum.strategy)
	})
	.strict();

const payload = z.discriminatedUnion('type', [
	measurePayload,
	modelPayload,
	operationalGoalPayload,
	strategicGoalPayload,
	strategyPayload
]);

export type Payload = z.infer<typeof payload>;

export const container = z.object({
	guid: z.string().uuid(),
	payload: payload,
	realm: z.string().max(1024),
	relation: z.array(relation),
	revision: z.number().int().positive(),
	user: z.array(user),
	valid_currently: z.boolean(),
	valid_from: z.number().int()
});

export type Container = z.infer<typeof container>;

const measureContainer = container.extend({
	payload: measurePayload
});

export type MeasureContainer = z.infer<typeof measureContainer>;

export function isMeasureContainer(container: Container): container is MeasureContainer {
	return container.payload.type === payloadTypes.enum.measure;
}

const modelContainer = container.extend({
	payload: modelPayload
});

export type ModelContainer = z.infer<typeof modelContainer>;

export function isModelContainer(container: Container): container is ModelContainer {
	return container.payload.type === payloadTypes.enum.model;
}

const operationalGoalContainer = container.extend({
	payload: operationalGoalPayload
});

export type OperationalGoalContainer = z.infer<typeof operationalGoalContainer>;

export function isOperationalGoalContainer(
	container: Container
): container is OperationalGoalContainer {
	return container.payload.type === payloadTypes.enum.operational_goal;
}

const strategicGoalContainer = container.extend({
	payload: strategicGoalPayload
});

export type StrategicGoalContainer = z.infer<typeof strategicGoalContainer>;

export function isStrategicGoalGoalContainer(
	container: Container
): container is StrategicGoalContainer {
	return container.payload.type === payloadTypes.enum.strategic_goal;
}

const strategyContainer = container.extend({
	payload: strategyPayload
});

export type StrategyContainer = z.infer<typeof strategyContainer>;

export function isStrategyContainer(container: Container): container is StrategyContainer {
	return container.payload.type === payloadTypes.enum.strategy;
}

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

export interface CustomEventMap {
	submitSuccessful: {
		event: SubmitEvent;
		result: Container;
	};
}
