import { Cog8Tooth, Flag, LightBulb, Pencil } from 'svelte-hero-icons';
import type { IconSource } from 'svelte-hero-icons';
import { z } from 'zod';
import sdg01 from '$lib/assets/sdg/sdg-01.svg';
import sdg02 from '$lib/assets/sdg/sdg-02.svg';
import sdg03 from '$lib/assets/sdg/sdg-03.svg';
import sdg04 from '$lib/assets/sdg/sdg-04.svg';
import sdg05 from '$lib/assets/sdg/sdg-05.svg';
import sdg06 from '$lib/assets/sdg/sdg-06.svg';
import sdg07 from '$lib/assets/sdg/sdg-07.svg';
import sdg08 from '$lib/assets/sdg/sdg-08.svg';
import sdg09 from '$lib/assets/sdg/sdg-09.svg';
import sdg10 from '$lib/assets/sdg/sdg-10.svg';
import sdg11 from '$lib/assets/sdg/sdg-11.svg';
import sdg12 from '$lib/assets/sdg/sdg-12.svg';
import sdg13 from '$lib/assets/sdg/sdg-13.svg';
import sdg14 from '$lib/assets/sdg/sdg-14.svg';
import sdg15 from '$lib/assets/sdg/sdg-15.svg';
import sdg16 from '$lib/assets/sdg/sdg-16.svg';
import sdg17 from '$lib/assets/sdg/sdg-17.svg';

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

export const sdgIcons = new Map<SustainableDevelopmentGoal, string>([
	[sustainableDevelopmentGoals.enum['sdg.01'], sdg01],
	[sustainableDevelopmentGoals.enum['sdg.02'], sdg02],
	[sustainableDevelopmentGoals.enum['sdg.03'], sdg03],
	[sustainableDevelopmentGoals.enum['sdg.04'], sdg04],
	[sustainableDevelopmentGoals.enum['sdg.05'], sdg05],
	[sustainableDevelopmentGoals.enum['sdg.06'], sdg06],
	[sustainableDevelopmentGoals.enum['sdg.07'], sdg07],
	[sustainableDevelopmentGoals.enum['sdg.08'], sdg08],
	[sustainableDevelopmentGoals.enum['sdg.09'], sdg09],
	[sustainableDevelopmentGoals.enum['sdg.10'], sdg10],
	[sustainableDevelopmentGoals.enum['sdg.11'], sdg11],
	[sustainableDevelopmentGoals.enum['sdg.12'], sdg12],
	[sustainableDevelopmentGoals.enum['sdg.13'], sdg13],
	[sustainableDevelopmentGoals.enum['sdg.14'], sdg14],
	[sustainableDevelopmentGoals.enum['sdg.15'], sdg15],
	[sustainableDevelopmentGoals.enum['sdg.16'], sdg16],
	[sustainableDevelopmentGoals.enum['sdg.17'], sdg17]
]);

export type SustainableDevelopmentGoal = z.infer<typeof sustainableDevelopmentGoals>;

export function isSustainableDevelopmentGoal(value: unknown): value is SustainableDevelopmentGoal {
	return sdgValues.includes(value as SustainableDevelopmentGoal);
}

const payloadTypeValues = [
	'internal_objective.internal_strategy',
	'internal_objective.vision',
	'internal_objective.strategic_goal',
	'internal_objective.milestone',
	'internal_objective.task',
	'measure',
	'model',
	'operational_goal',
	'strategic_goal',
	'strategy',
	'text'
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

const predicateValues = ['is-part-of', 'is-part-of-measure'] as const;

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

const taskStatusValues = [
	'task_status.idea',
	'task_status.in_planning',
	'task_status.in_progress',
	'task_status.done'
] as const;

export const taskStatus = z.enum(taskStatusValues);

export const taskStatusColors = new Map<TaskStatus, string>([
	[taskStatus.enum['task_status.idea'], 'red'],
	[taskStatus.enum['task_status.in_planning'], 'orange'],
	[taskStatus.enum['task_status.in_progress'], 'yellow'],
	[taskStatus.enum['task_status.done'], 'green']
]);

export const taskStatusIcons = new Map<TaskStatus, IconSource>([
	[taskStatus.enum['task_status.idea'], LightBulb],
	[taskStatus.enum['task_status.in_planning'], Pencil],
	[taskStatus.enum['task_status.in_progress'], Cog8Tooth],
	[taskStatus.enum['task_status.done'], Flag]
]);

export type TaskStatus = z.infer<typeof taskStatus>;

export function isTaskStatus(value: unknown): value is TaskStatus {
	return taskStatusValues.includes(value as TaskStatus);
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
	position: z.number().int().nonnegative(),
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
	value: z.number().nonnegative().optional()
});

export type Indicator = z.infer<typeof indicator>;

const basePayload = z
	.object({
		category: z.array(sustainableDevelopmentGoals),
		description: z.string(),
		summary: z.string().max(200).optional(),
		title: z.string(),
		topic: z.array(topics)
	})
	.strict();

const internalObjectivesBasePayload = z.object({
	description: z.string(),
	summary: z.string().max(200).optional(),
	title: z.string()
});

const internalStrategyPayload = internalObjectivesBasePayload
	.extend({
		type: z.literal(payloadTypes.enum['internal_objective.internal_strategy'])
	})
	.strict();

const visionPayload = internalObjectivesBasePayload
	.extend({
		type: z.literal(payloadTypes.enum['internal_objective.vision'])
	})
	.strict();

const internalObjectiveStrategicGoalPayload = internalObjectivesBasePayload
	.extend({
		type: z.literal(payloadTypes.enum['internal_objective.strategic_goal'])
	})
	.strict();

const milestonePayload = internalObjectivesBasePayload
	.extend({
		progress: z.number().nonnegative(),
		type: z.literal(payloadTypes.enum['internal_objective.milestone'])
	})
	.strict();

const taskPayload = internalObjectivesBasePayload
	.extend({
		taskStatus: taskStatus,
		type: z.literal(payloadTypes.enum['internal_objective.task'])
	})
	.strict();

const measurePayload = basePayload
	.extend({
		annotation: z.string().optional(),
		comment: z.string().optional(),
		endDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		indicatorContribution: z.record(z.string().uuid(), z.coerce.number().nonnegative()).optional(),
		indicatorContributionAchieved: z
			.record(z.string().uuid(), z.coerce.number().nonnegative())
			.optional(),
		resource: z.array(
			z.object({
				description: z.string(),
				amount: z.coerce.number(),
				unit: z.string(),
				fulfillmentDate: z.string().refine((v) => z.coerce.date().safeParse(v))
			})
		),
		result: z.string().optional(),
		startDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
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
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
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
	.omit({
		description: true,
		summary: true
	})
	.extend({
		image: z.string().url().optional(),
		level: levels,
		strategyType: strategyTypes,
		type: z.literal(payloadTypes.enum.strategy)
	})
	.strict();

const textPayload = z
	.object({ body: z.string(), title: z.string(), type: z.literal(payloadTypes.enum.text) })
	.strict();

const payload = z.discriminatedUnion('type', [
	internalStrategyPayload,
	visionPayload,
	internalObjectiveStrategicGoalPayload,
	milestonePayload,
	taskPayload,
	measurePayload,
	modelPayload,
	operationalGoalPayload,
	strategicGoalPayload,
	strategyPayload,
	textPayload
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
	valid_from: z.coerce.date()
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

const textContainer = container.extend({
	payload: textPayload
});

export type TextContainer = z.infer<typeof textContainer>;

export function isTextContainer(container: Container): container is TextContainer {
	return container.payload.type === payloadTypes.enum.text;
}

const internalStrategyContainer = container.extend({
	payload: internalStrategyPayload
});

export type InternalStrategyContainer = z.infer<typeof internalStrategyContainer>;

export function isInternalStrategyContainer(
	container: Container
): container is InternalStrategyContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.internal_strategy'];
}

const visionContainer = container.extend({
	payload: visionPayload
});

export type VisionContainer = z.infer<typeof visionContainer>;

export function isVisionContainer(container: Container): container is VisionContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.vision'];
}

const internalObjectiveStrategicGoalContainer = container.extend({
	payload: internalObjectiveStrategicGoalPayload
});

export type InternalObjectiveStrategicGoalContainer = z.infer<
	typeof internalObjectiveStrategicGoalContainer
>;

export function isInternalObjectiveStrategicGoalContainer(
	container: Container
): container is InternalObjectiveStrategicGoalContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.strategic_goal'];
}

const milestoneContainer = container.extend({
	payload: milestonePayload
});

export type MilestoneContainer = z.infer<typeof milestoneContainer>;

export function isMilestoneContainer(container: Container): container is MilestoneContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.milestone'];
}

const taskContainer = container.extend({
	payload: taskPayload
});

export type TaskContainer = z.infer<typeof taskContainer>;

export function isTaskContainer(container: Container): container is TaskContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.task'];
}

export type InternalObjectiveContainer =
	| InternalStrategyContainer
	| VisionContainer
	| InternalObjectiveStrategicGoalContainer
	| MilestoneContainer
	| TaskContainer;

export function isInternalObjectiveContainer(
	container: Container
): container is InternalObjectiveContainer {
	return (
		isInternalStrategyContainer(container) ||
		isVisionContainer(container) ||
		isInternalObjectiveStrategicGoalContainer(container) ||
		isMilestoneContainer(container) ||
		isTaskContainer(container)
	);
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

const emptyContainer = newContainer.extend({
	payload: z.discriminatedUnion('type', [
		measurePayload.partial().merge(measurePayload.pick({ type: true })),
		modelPayload.partial().merge(modelPayload.pick({ type: true })),
		operationalGoalPayload
			.partial()
			.merge(operationalGoalPayload.pick({ indicator: true, type: true })),
		strategicGoalPayload.partial().merge(strategicGoalPayload.pick({ type: true })),
		strategyPayload.partial().merge(strategyPayload.pick({ type: true })),
		textPayload.partial().merge(textPayload.pick({ type: true })),
		internalStrategyPayload.partial().merge(internalStrategyPayload.pick({ type: true })),
		visionPayload.partial().merge(visionPayload.pick({ type: true })),
		internalObjectiveStrategicGoalPayload
			.partial()
			.merge(internalObjectiveStrategicGoalPayload.pick({ type: true })),
		milestonePayload.partial().merge(milestonePayload.pick({ type: true })),
		taskPayload.partial().merge(taskPayload.pick({ type: true }))
	])
});

export type EmptyContainer = z.infer<typeof emptyContainer>;

const emptyMeasureContainer = emptyContainer.extend({
	payload: measurePayload.partial().merge(measurePayload.pick({ type: true }))
});

export type EmptyMeasureContainer = z.infer<typeof emptyMeasureContainer>;

export function isEmptyMeasureContainer(
	container: EmptyContainer
): container is EmptyMeasureContainer {
	return container.payload.type === payloadTypes.enum.measure;
}

const emptyModelContainer = emptyContainer.extend({
	payload: modelPayload.partial().merge(modelPayload.pick({ type: true }))
});

export type EmptyModelContainer = z.infer<typeof emptyModelContainer>;

export function isEmptyModelContainer(container: EmptyContainer): container is EmptyModelContainer {
	return container.payload.type === payloadTypes.enum.model;
}

const emptyOperationalGoalContainer = emptyContainer.extend({
	payload: operationalGoalPayload
		.partial()
		.merge(operationalGoalPayload.pick({ indicator: true, type: true }))
});

export type EmptyOperationalGoalContainer = z.infer<typeof emptyOperationalGoalContainer>;

export function isEmptyOperationalGoalContainer(
	container: EmptyContainer
): container is EmptyOperationalGoalContainer {
	return container.payload.type === payloadTypes.enum.operational_goal;
}

const emptyStrategicGoalContainer = emptyContainer.extend({
	payload: strategicGoalPayload.partial().merge(strategicGoalPayload.pick({ type: true }))
});

export type EmptyStrategicGoalContainer = z.infer<typeof emptyStrategicGoalContainer>;

export function isEmptyStrategicGoalContainer(
	container: EmptyContainer
): container is EmptyStrategicGoalContainer {
	return container.payload.type === payloadTypes.enum.strategic_goal;
}

const emptyStrategyContainer = emptyContainer.extend({
	payload: strategyPayload.partial().merge(strategyPayload.pick({ type: true }))
});

export type EmptyStrategyContainer = z.infer<typeof emptyStrategyContainer>;

export function isEmptyStrategyContainer(
	container: EmptyContainer
): container is EmptyStrategyContainer {
	return container.payload.type === payloadTypes.enum.strategy;
}

const emptyTextContainer = emptyContainer.extend({
	payload: textPayload.partial().merge(textPayload.pick({ type: true }))
});

export type EmptyTextContainer = z.infer<typeof emptyTextContainer>;

export function isEmptyTextContainer(container: EmptyContainer): container is EmptyTextContainer {
	return container.payload.type === payloadTypes.enum.text;
}

const emptyInternalStrategyContainer = emptyContainer.extend({
	payload: internalStrategyPayload.partial().merge(internalStrategyPayload.pick({ type: true }))
});

export type EmptyInternalStrategyContainer = z.infer<typeof emptyInternalStrategyContainer>;

export function isEmptyInternalStrategyContainer(
	container: EmptyContainer
): container is EmptyInternalStrategyContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.internal_strategy'];
}

const emptyVisionContainer = emptyContainer.extend({
	payload: visionPayload.partial().merge(visionPayload.pick({ type: true }))
});

export type EmptyVisionContainer = z.infer<typeof emptyVisionContainer>;

export function isEmptyVisionContainer(
	container: EmptyContainer
): container is EmptyVisionContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.vision'];
}

const emptyInternalObjectiveStrategicGoalContainer = emptyContainer.extend({
	payload: internalObjectiveStrategicGoalPayload
		.partial()
		.merge(internalObjectiveStrategicGoalPayload.pick({ type: true }))
});

export type EmptyInternalObjectiveStrategicGoalContainer = z.infer<
	typeof emptyInternalObjectiveStrategicGoalContainer
>;

export function isEmptyInternalObjectiveStrategicGoalContainer(
	container: EmptyContainer
): container is EmptyInternalObjectiveStrategicGoalContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.strategic_goal'];
}

const emptyMilestoneContainer = emptyContainer.extend({
	payload: milestonePayload.partial().merge(milestonePayload.pick({ type: true }))
});

export type EmptyMilestoneContainer = z.infer<typeof emptyMilestoneContainer>;

export function isEmptyMilestoneContainer(
	container: EmptyContainer
): container is EmptyMilestoneContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.milestone'];
}

const emptyTaskContainer = emptyContainer.extend({
	payload: taskPayload.partial().merge(taskPayload.pick({ type: true }))
});

export type EmptyTaskContainer = z.infer<typeof emptyTaskContainer>;

export function isEmptyTaskContainer(container: EmptyContainer): container is EmptyTaskContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.task'];
}

export const modifiedContainer = container
	.omit({
		revision: true,
		valid_currently: true,
		valid_from: true
	})
	.extend({
		relation: z.array(partialRelation)
	});

export type EmptyInternalObjectiveContainer =
	| EmptyInternalStrategyContainer
	| EmptyVisionContainer
	| EmptyInternalObjectiveStrategicGoalContainer
	| EmptyMilestoneContainer
	| EmptyTaskContainer;

export function isEmptyInternalObjectiveContainer(
	container: Container
): container is InternalObjectiveContainer {
	return (
		isEmptyInternalStrategyContainer(container) ||
		isEmptyVisionContainer(container) ||
		isEmptyStrategicGoalContainer(container) ||
		isEmptyMilestoneContainer(container) ||
		isEmptyTaskContainer(container)
	);
}
export type ModifiedContainer = z.infer<typeof modifiedContainer>;

export interface CustomEventMap {
	deleteSuccessful: {
		event: Event;
	};
	submitSuccessful: {
		event: SubmitEvent;
		result: Container;
	};
}

export function isPartOf(container: { relation: PartialRelation[] }) {
	return function (candidate: Container) {
		return (
			container.relation.findIndex(
				(r) => r.predicate === predicates.enum['is-part-of'] && r.subject === candidate.revision
			) > -1
		);
	};
}

export function etag(container: Container) {
	return `"${container.revision}"`;
}
