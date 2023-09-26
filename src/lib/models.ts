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
	'internal_objective.internal_strategy',
	'internal_objective.vision',
	'internal_objective.strategic_goal',
	'internal_objective.milestone',
	'internal_objective.task',
	'measure',
	'model',
	'operational_goal',
	'organization',
	'organizational_unit',
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

const predicateValues = [
	'is-consistent-with',
	'is-creator-of',
	'is-duplicate-of',
	'is-equivalent-to',
	'is-inconsistent-with',
	'is-part-of',
	'is-part-of-measure'
] as const;

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
	'status.done'
] as const;

export const status = z.enum(statusValues);

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
	'quantity.broadband_coverage',
	'quantity.charging_stations',
	'quantity.co2',
	'quantity.co2_emissions_households',
	'quantity.co2_emissions_industry',
	'quantity.co2_emissions_transport',
	'quantity.cycle_path',
	'quantity.organic_farming',
	'quantity.parking_space',
	'quantity.doctor_ratio',
	'quantity.funding_culture_and_education',
	'quantity.women_in_elective_office',
	'quantity.women_in_leadership',
	'quantity.renewable_energy',
	'quantity.solar_energy',
	'quantity.waste_generation',
	'quantity.water_consumption'
] as const;

export const quantities = z.enum(quantityValues);

export type Quantity = z.infer<typeof quantities>;

export function isQuantity(value: unknown): value is Quantity {
	return quantityValues.includes(value as Quantity);
}

const unitValues = [
	'unit.cubic_meter',
	'unit.euro',
	'unit.kilowatt',
	'unit.kilowatt_hour',
	'unit.kilometer',
	'unit.percent',
	'unit.per_100000',
	'unit.ton'
] as const;

export const units = z.enum(unitValues);

export type Unit = z.infer<typeof units>;

export function isUnit(value: unknown): value is Unit {
	return unitValues.includes(value as Unit);
}

export const unitByQuantity = new Map<Quantity, Unit>([
	[quantities.enum['quantity.broadband_coverage'], units.enum['unit.percent']],
	[quantities.enum['quantity.co2'], units.enum['unit.ton']],
	[quantities.enum['quantity.co2_emissions_households'], units.enum['unit.ton']],
	[quantities.enum['quantity.co2_emissions_industry'], units.enum['unit.ton']],
	[quantities.enum['quantity.co2_emissions_transport'], units.enum['unit.ton']],
	[quantities.enum['quantity.cycle_path'], units.enum['unit.kilometer']],
	[quantities.enum['quantity.organic_farming'], units.enum['unit.percent']],
	[quantities.enum['quantity.doctor_ratio'], units.enum['unit.per_100000']],
	[quantities.enum['quantity.funding_culture_and_education'], units.enum['unit.euro']],
	[quantities.enum['quantity.women_in_elective_office'], units.enum['unit.percent']],
	[quantities.enum['quantity.women_in_leadership'], units.enum['unit.percent']],
	[quantities.enum['quantity.renewable_energy'], units.enum['unit.kilowatt']],
	[quantities.enum['quantity.solar_energy'], units.enum['unit.kilowatt_hour']],
	[quantities.enum['quantity.waste_generation'], units.enum['unit.ton']],
	[quantities.enum['quantity.water_consumption'], units.enum['unit.cubic_meter']]
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
	display_name: z.string().max(64),
	realm: z.string().max(1024),
	subject: z.string().uuid()
});

export type User = z.infer<typeof user>;

export const userRelation = z.object({
	predicate: z.string().max(128),
	subject: z.string().uuid()
});

const indicator = z.object({
	max: z.coerce.number().nonnegative(),
	min: z.coerce.number().nonnegative(),
	quantity: z.string().optional(),
	value: z.number().nonnegative().optional()
});

export type Indicator = z.infer<typeof indicator>;

export const taskPriority = z.object({
	priority: z.number().int(),
	task: z.number().positive()
});

export type TaskPriority = z.infer<typeof taskPriority>;

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
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		progress: z.number().nonnegative(),
		type: z.literal(payloadTypes.enum['internal_objective.milestone'])
	})
	.strict();

const taskPayload = internalObjectivesBasePayload
	.extend({
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
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

const organizationPayload = z.object({
	default: z.boolean(),
	description: z.string(),
	image: z.string().url().optional(),
	name: z.string(),
	type: z.literal(payloadTypes.enum.organization)
});

const organizationalUnitPayload = z.object({
	description: z.string(),
	image: z.string().url().optional(),
	level: z.number().int().positive(),
	name: z.string(),
	type: z.literal(payloadTypes.enum.organizational_unit)
});

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

export const container = z.object({
	guid: z.string().uuid(),
	organization: z.string().uuid(),
	organizational_unit: z.string().uuid().nullable(),
	payload: z.discriminatedUnion('type', [
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
	]),
	realm: z.string().max(1024),
	relation: z.array(relation),
	revision: z.number().int().positive(),
	user: z.array(userRelation),
	valid_currently: z.boolean(),
	valid_from: z.coerce.date()
});

export type Container = z.infer<typeof container>;

export const anyContainer = container.extend({
	payload: z.discriminatedUnion('type', [
		internalStrategyPayload,
		visionPayload,
		internalObjectiveStrategicGoalPayload,
		milestonePayload,
		taskPayload,
		measurePayload,
		modelPayload,
		operationalGoalPayload,
		organizationPayload,
		organizationalUnitPayload,
		strategicGoalPayload,
		strategyPayload,
		textPayload
	])
});

export type AnyContainer = z.infer<typeof anyContainer>;

const measureContainer = container.extend({
	payload: measurePayload
});

export type MeasureContainer = z.infer<typeof measureContainer>;

export function isMeasureContainer(container: AnyContainer): container is MeasureContainer {
	return container.payload.type === payloadTypes.enum.measure;
}

const modelContainer = container.extend({
	payload: modelPayload
});

export type ModelContainer = z.infer<typeof modelContainer>;

export function isModelContainer(container: AnyContainer): container is ModelContainer {
	return container.payload.type === payloadTypes.enum.model;
}

const operationalGoalContainer = container.extend({
	payload: operationalGoalPayload
});

export type OperationalGoalContainer = z.infer<typeof operationalGoalContainer>;

export function isOperationalGoalContainer(
	container: AnyContainer
): container is OperationalGoalContainer {
	return container.payload.type === payloadTypes.enum.operational_goal;
}

export const organizationContainer = container.extend({
	payload: organizationPayload
});

export type OrganizationContainer = z.infer<typeof organizationContainer>;

export function isOrganizationContainer(
	container: AnyContainer
): container is OrganizationContainer {
	return container.payload.type === payloadTypes.enum.organization;
}

export const organizationalUnitContainer = container.extend({
	payload: organizationalUnitPayload
});

export type OrganizationalUnitContainer = z.infer<typeof organizationalUnitContainer>;

export function isOrganizationalUnitContainer(
	container: AnyContainer
): container is OrganizationalUnitContainer {
	return container.payload.type === payloadTypes.enum.organizational_unit;
}

const strategicGoalContainer = container.extend({
	payload: strategicGoalPayload
});

export type StrategicGoalContainer = z.infer<typeof strategicGoalContainer>;

export function isStrategicGoalGoalContainer(
	container: AnyContainer
): container is StrategicGoalContainer {
	return container.payload.type === payloadTypes.enum.strategic_goal;
}

const strategyContainer = container.extend({
	payload: strategyPayload
});

export type StrategyContainer = z.infer<typeof strategyContainer>;

export function isStrategyContainer(container: AnyContainer): container is StrategyContainer {
	return container.payload.type === payloadTypes.enum.strategy;
}

const textContainer = container.extend({
	payload: textPayload
});

export type TextContainer = z.infer<typeof textContainer>;

export function isTextContainer(container: AnyContainer): container is TextContainer {
	return container.payload.type === payloadTypes.enum.text;
}

const internalStrategyContainer = container.extend({
	payload: internalStrategyPayload
});

export type InternalStrategyContainer = z.infer<typeof internalStrategyContainer>;

export function isInternalStrategyContainer(
	container: AnyContainer
): container is InternalStrategyContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.internal_strategy'];
}

const visionContainer = container.extend({
	payload: visionPayload
});

export type VisionContainer = z.infer<typeof visionContainer>;

export function isVisionContainer(container: AnyContainer): container is VisionContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.vision'];
}

const internalObjectiveStrategicGoalContainer = container.extend({
	payload: internalObjectiveStrategicGoalPayload
});

export type InternalObjectiveStrategicGoalContainer = z.infer<
	typeof internalObjectiveStrategicGoalContainer
>;

export function isInternalObjectiveStrategicGoalContainer(
	container: AnyContainer
): container is InternalObjectiveStrategicGoalContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.strategic_goal'];
}

const milestoneContainer = container.extend({
	payload: milestonePayload
});

export type MilestoneContainer = z.infer<typeof milestoneContainer>;

export function isMilestoneContainer(container: AnyContainer): container is MilestoneContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.milestone'];
}

const taskContainer = container.extend({
	payload: taskPayload
});

export type TaskContainer = z.infer<typeof taskContainer>;

export function isTaskContainer(container: AnyContainer): container is TaskContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.task'];
}

export type InternalObjectiveContainer =
	| InternalStrategyContainer
	| VisionContainer
	| InternalObjectiveStrategicGoalContainer
	| MilestoneContainer
	| TaskContainer;

export function isInternalObjectiveContainer(
	container: AnyContainer
): container is InternalObjectiveContainer {
	return (
		isInternalStrategyContainer(container) ||
		isVisionContainer(container) ||
		isInternalObjectiveStrategicGoalContainer(container) ||
		isMilestoneContainer(container) ||
		isTaskContainer(container)
	);
}

export function isContainer(container: AnyContainer): container is Container {
	return (
		container.payload.type !== payloadTypes.enum.organization &&
		container.payload.type !== payloadTypes.enum.organizational_unit
	);
}

export const newContainer = anyContainer
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
		organizationPayload.partial().merge(organizationPayload.pick({ type: true })),
		organizationalUnitPayload.partial().merge(organizationalUnitPayload.pick({ type: true })),
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

const emptyOrganizationContainer = newContainer.extend({
	payload: organizationPayload.partial().merge(organizationPayload.pick({ type: true }))
});

export type EmptyOrganizationContainer = z.infer<typeof emptyOrganizationContainer>;

export function isEmptyOrganizationContainer(
	container: EmptyContainer
): container is EmptyOrganizationContainer {
	return container.payload.type === payloadTypes.enum.organization;
}

const emptyOrganizationalUnitContainer = newContainer.extend({
	payload: organizationalUnitPayload.partial().merge(organizationalUnitPayload.pick({ type: true }))
});

export type EmptyOrganizationalUnitContainer = z.infer<typeof emptyOrganizationalUnitContainer>;

export function isEmptyOrganizationalUnitContainer(
	container: EmptyContainer
): container is EmptyOrganizationalUnitContainer {
	return container.payload.type === payloadTypes.enum.organizational_unit;
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

export const modifiedContainer = anyContainer
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
	container: AnyContainer
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
		result: AnyContainer;
	};
}

export function isPartOf(container: { relation: PartialRelation[]; revision: number }) {
	return function (candidate: AnyContainer) {
		return (
			container.relation.findIndex(
				(r) =>
					r.predicate === predicates.enum['is-part-of'] &&
					r.subject === candidate.revision &&
					candidate.revision !== container.revision
			) > -1
		);
	};
}

export function etag(container: AnyContainer) {
	return `"${container.revision}"`;
}

export function owners<T extends OrganizationContainer | OrganizationalUnitContainer>(
	container: Container,
	candidates: Array<T>
) {
	return (
		candidates.filter(
			({ guid }) => container.organization == guid || container.organizational_unit == guid
		) ?? []
	);
}
