import { z } from 'zod';

export type ContainerDetailViewTabKey = 'basic-data' | 'effects' | 'resources';

export type ContainerFormTabKey = ContainerDetailViewTabKey | 'historical-values' | 'metadata';

export type ApplicationState = {
	containerDetailView: {
		activeTab?: ContainerDetailViewTabKey;
		tabs: Array<ContainerDetailViewTabKey>;
	};
	containerForm: {
		activeTab?: ContainerFormTabKey;
		tabs: Array<ContainerFormTabKey>;
	};
	organizationMenu: {
		showDropDown: boolean;
	};
};

export const overlayKey = z.enum([
	'create',
	'edit',
	'edit-help',
	'indicators',
	'internal-objectives',
	'members',
	'my-tasks',
	'profile',
	'relate',
	'relations',
	'tasks',
	'view',
	'view-help'
]);

export type OverlayKey = z.infer<typeof overlayKey>;

export function isOverlayKey(s: string): s is OverlayKey {
	return overlayKey.safeParse(s).success;
}

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

const payloadTypeValues = [
	'indicator',
	'indicator_template',
	'internal_objective.internal_strategy',
	'internal_objective.vision',
	'internal_objective.strategic_goal',
	'internal_objective.milestone',
	'internal_objective.task',
	'kpi',
	'measure',
	'model',
	'operational_goal',
	'organization',
	'organizational_unit',
	'page',
	'simple_measure',
	'strategic_goal',
	'strategy',
	'text',
	'undefined'
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
	'implements',
	'is-admin-of',
	'is-consistent-with',
	'is-creator-of',
	'is-duplicate-of',
	'is-equivalent-to',
	'is-inconsistent-with',
	'is-member-of',
	'is-part-of',
	'is-part-of-measure',
	'is-part-of-strategy'
] as const;

export const predicates = z.enum(predicateValues);

export type Predicate = z.infer<typeof predicates>;

const statusValues = [
	'status.idea',
	'status.in_planning',
	'status.in_implementation',
	'status.in_operation',
	'status.done'
] as const;

export const status = z.enum(statusValues);

export type Status = z.infer<typeof status>;

const taskStatusValues = [
	'task_status.idea',
	'task_status.in_planning',
	'task_status.in_progress',
	'task_status.done'
] as const;

export const taskStatus = z.enum(taskStatusValues);

export type TaskStatus = z.infer<typeof taskStatus>;

const strategyTypeValues = [
	'strategy_type.mobility',
	'strategy_type.sustainability',
	'strategy_type.smart_city',
	'strategy_type.isek'
] as const;

export const strategyTypes = z.enum(strategyTypeValues);

export type StrategyType = z.infer<typeof strategyTypes>;

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

const taskCategoryValues = [
	'task_category.default',
	'task_category.program_management',
	'task_category.bugfix',
	'task_category.design',
	'task_category.function',
	'task_category.wording'
] as const;

export const taskCategories = z.enum(taskCategoryValues);

export type TaskCategory = z.infer<typeof taskCategories>;

const organizationCategoryValues = [
	'organization_category.business',
	'organization_category.government',
	'organization_category.non_profit',
	'organization_category.political'
] as const;

export const organizationCategories = z.enum(organizationCategoryValues);

export type OrganizationCategory = z.infer<typeof organizationCategories>;

const indicatorCategoryValues = [
	'indicator_category.kpi',
	'indicator_category.sdg',
	'indicator_category.custom'
] as const;

export const indicatorCategories = z.enum(indicatorCategoryValues);

export type indicatorCategory = z.infer<typeof indicatorCategories>;

const quantityValues = [
	'quantity.custom',
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
	'unit.euro_per_capita',
	'unit.euro_per_square_meter',
	'unit.kilogram_per_hectare',
	'unit.kilowatt',
	'unit.kilowatt_hour',
	'unit.kilometer',
	'unit.liter_per_capita_per_day',
	'unit.microgram_per_cubic_meter',
	'unit.n',
	'unit.percent',
	'unit.per_1000',
	'unit.per_100000',
	'unit.square_kilometer_per_capita',
	'unit.square_meter',
	'unit.ton',
	'unit.ton_per_capita',
	'unit.watt_per_capita'
] as const;

export const units = z.enum(unitValues);

export type Unit = z.infer<typeof units>;

export const unitByQuantity = new Map<Quantity, Unit>([
	[quantities.enum['quantity.broadband_coverage'], units.enum['unit.percent']],
	[quantities.enum['quantity.charging_stations'], units.enum['unit.per_1000']],
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

const audienceValues = [
	'audience.public',
	'audience.organization',
	'audience.project_management'
] as const;

export const audience = z.enum(audienceValues);

export type Audience = z.infer<typeof audience>;

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
	guid: z.string().uuid()
});

export type User = z.infer<typeof user>;

export const newUser = z.object({
	email: z.string().email(),
	organization: z.string().uuid(),
	realm: z.string().max(1024)
});

export type NewUser = z.infer<typeof newUser>;

export const userRelation = z.object({
	predicate: predicates,
	subject: z.string().uuid()
});

const indicator = z.object({
	max: z.coerce.number().nonnegative(),
	min: z.coerce.number().nonnegative(),
	quantity: z.string().optional(),
	value: z.number().nonnegative().optional()
});

export type Indicator = z.infer<typeof indicator>;

const indicatorEffect = z.object({
	indicator: z.string().uuid(),
	achievedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
	plannedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([])
});

export type IndicatorEffect = z.infer<typeof indicatorEffect>;

const indicatorObjective = z.object({
	indicator: z.string().uuid(),
	wantedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([])
});

export type IndicatorObjective = z.infer<typeof indicatorObjective>;

export const taskPriority = z.object({
	priority: z.number().int(),
	task: z.string().uuid()
});

export type TaskPriority = z.infer<typeof taskPriority>;

export const visibility = z.enum(['creator', 'members', 'public']);

export const boards = z.enum([
	'board.indicators',
	'board.internal_objectives',
	'board.organizational_units',
	'board.tasks'
]);

const basePayload = z
	.object({
		audience: z.array(audience).default([audience.enum['audience.public']]),
		category: z.array(sustainableDevelopmentGoals).default([]),
		description: z.string().optional(),
		summary: z.string().max(200).optional(),
		title: z.string(),
		topic: z.array(topics).default([]),
		visibility: visibility.default('members')
	})
	.strict();

const indicatorPayload = basePayload.extend({
	historicalValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
	historicalValuesIntro: z.string().optional(),
	indicatorCategory: z.array(indicatorCategories).default([]),
	measuresIntro: z.string().optional(),
	objectivesIntro: z.string().optional(),
	quantity: z.string(),
	type: z.literal(payloadTypes.enum.indicator),
	unit: z.string()
});

const indicatorTemplatePayload = indicatorPayload
	.extend({
		type: z.literal(payloadTypes.enum.indicator_template)
	})
	.omit({ historicalValues: true, quantity: true });

const internalObjectivesBasePayload = z.object({
	audience: z.array(audience).default([audience.enum['audience.public']]),
	description: z.string().optional(),
	summary: z.string().max(200).optional(),
	title: z.string(),
	visibility: visibility.default('members')
});

const internalStrategyPayload = internalObjectivesBasePayload
	.extend({
		type: z.literal(payloadTypes.enum['internal_objective.internal_strategy'])
	})
	.strict();

const visionPayload = internalObjectivesBasePayload
	.extend({
		objective: z.array(indicatorObjective).default([]),
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
		objective: z.array(indicatorObjective).default([]),
		progress: z.number().nonnegative().default(0),
		type: z.literal(payloadTypes.enum['internal_objective.milestone'])
	})
	.strict();

const kpiPayload = internalObjectivesBasePayload.extend({
	effect: z.array(indicatorEffect).default([]),
	fulfillmentDate: z
		.string()
		.refine((v) => z.coerce.date().safeParse(v))
		.optional(),
	status: status.default(status.enum['status.idea']),
	type: z.literal(payloadTypes.enum.kpi)
});

const taskPayload = internalObjectivesBasePayload
	.omit({ audience: true, summary: true })
	.extend({
		assignee: z.string().uuid().optional(),
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		taskCategory: taskCategories.optional(),
		taskStatus: taskStatus.default(taskStatus.enum['task_status.idea']),
		type: z.literal(payloadTypes.enum['internal_objective.task'])
	})
	.strict();

const measurePayload = basePayload
	.extend({
		annotation: z.string().optional(),
		boards: z.array(boards).default([]),
		comment: z.string().optional(),
		endDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		indicatorContribution: z.record(z.string().uuid(), z.coerce.number().nonnegative()).optional(),
		indicatorContributionAchieved: z
			.record(z.string().uuid(), z.coerce.number().nonnegative())
			.optional(),
		effect: z.array(indicatorEffect).default([]),
		resource: z
			.array(
				z.object({
					description: z.string(),
					amount: z.coerce.number(),
					unit: z.string(),
					fulfillmentDate: z.string().refine((v) => z.coerce.date().safeParse(v))
				})
			)
			.default([]),
		result: z.string().optional(),
		startDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		status: status.default(status.enum['status.idea']),
		type: z.literal(payloadTypes.enum.measure)
	})
	.strict();

const modelPayload = basePayload
	.extend({
		objective: z.array(indicatorObjective).default([]),
		type: z.literal(payloadTypes.enum.model)
	})
	.strict();

const operationalGoalPayload = basePayload
	.extend({
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		indicator: z.array(indicator).max(1).default([]),
		objective: z.array(indicatorObjective).default([]),
		type: z.literal(payloadTypes.enum.operational_goal)
	})
	.strict();

const organizationPayload = z.object({
	boards: z.array(boards).default([]),
	default: z.boolean().default(false),
	description: z.string().optional(),
	image: z.string().url().optional(),
	name: z.string(),
	organizationCategory: organizationCategories.optional(),
	type: z.literal(payloadTypes.enum.organization),
	visibility: visibility.default('members')
});

const organizationalUnitPayload = z.object({
	boards: z.array(boards).default([]),
	description: z.string().optional(),
	image: z.string().url().optional(),
	level: z.number().int().positive().default(1),
	name: z.string(),
	type: z.literal(payloadTypes.enum.organizational_unit),
	visibility: visibility.default('members')
});

const pagePayload = z.object({
	body: z.string(),
	slug: z.string(),
	title: z.string(),
	type: z.literal(payloadTypes.enum.page),
	visibility: visibility.default('public')
});

const simpleMeasurePayload = basePayload
	.omit({ summary: true })
	.extend({
		annotation: z.string().optional(),
		endDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		effect: z.array(indicatorEffect).default([]),
		progress: z.number().nonnegative().default(0),
		resource: z
			.array(
				z.object({
					description: z.string(),
					amount: z.coerce.number(),
					unit: z.string(),
					fulfillmentDate: z.string().refine((v) => z.coerce.date().safeParse(v))
				})
			)
			.default([]),
		startDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		status: status.default(status.enum['status.idea']),
		type: z.literal(payloadTypes.enum.simple_measure)
	})
	.strict();

const strategicGoalPayload = basePayload
	.extend({
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		objective: z.array(indicatorObjective).default([]),
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
		pdf: z.string().url().optional(),
		strategyType: strategyTypes,
		type: z.literal(payloadTypes.enum.strategy)
	})
	.strict();

const textPayload = z
	.object({
		audience: z.array(audience).default([audience.enum['audience.public']]),
		body: z.string().optional(),
		title: z.string(),
		type: z.literal(payloadTypes.enum.text),
		visibility: visibility.default('members')
	})
	.strict();

const undefinedPayload = z
	.object({
		title: z.string(),
		type: z.literal(payloadTypes.enum.undefined),
		visibility: visibility.default('members')
	})
	.strict();

export const container = z.object({
	guid: z.string().uuid(),
	organization: z.string().uuid(),
	organizational_unit: z.string().uuid().nullable(),
	payload: z.discriminatedUnion('type', [
		indicatorPayload,
		indicatorTemplatePayload,
		internalStrategyPayload,
		visionPayload,
		internalObjectiveStrategicGoalPayload,
		milestonePayload,
		taskPayload,
		kpiPayload,
		measurePayload,
		modelPayload,
		operationalGoalPayload,
		pagePayload,
		simpleMeasurePayload,
		strategicGoalPayload,
		strategyPayload,
		textPayload
	]),
	realm: z.string().max(1024),
	relation: z.array(relation).default([]),
	revision: z.number().int().positive(),
	user: z.array(userRelation).default([]),
	valid_currently: z.boolean(),
	valid_from: z.coerce.date()
});

export type Container = z.infer<typeof container>;

export const anyContainer = container.extend({
	payload: z.discriminatedUnion('type', [
		indicatorPayload,
		indicatorTemplatePayload,
		internalStrategyPayload,
		visionPayload,
		internalObjectiveStrategicGoalPayload,
		milestonePayload,
		taskPayload,
		kpiPayload,
		measurePayload,
		modelPayload,
		operationalGoalPayload,
		organizationPayload,
		organizationalUnitPayload,
		pagePayload,
		simpleMeasurePayload,
		strategicGoalPayload,
		strategyPayload,
		textPayload,
		undefinedPayload
	])
});

export type AnyContainer = z.infer<typeof anyContainer>;

export const containerWithObjective = container.extend({
	payload: z.discriminatedUnion('type', [
		milestonePayload,
		modelPayload,
		operationalGoalPayload,
		strategicGoalPayload,
		visionPayload
	])
});

export type ContainerWithObjective = z.infer<typeof containerWithObjective>;

export function isContainerWithObjective(
	container: AnyContainer | EmptyContainer
): container is ContainerWithObjective {
	return (
		isMilestoneContainer(container) ||
		isModelContainer(container) ||
		isOperationalGoalContainer(container) ||
		isStrategicGoalContainer(container) ||
		isVisionContainer(container)
	);
}

export const containerWithEffect = container.extend({
	payload: z.discriminatedUnion('type', [kpiPayload, measurePayload, simpleMeasurePayload])
});

export type ContainerWithEffect = z.infer<typeof containerWithEffect>;

export function isContainerWithEffect(
	container: AnyContainer | EmptyContainer
): container is ContainerWithEffect {
	return (
		isKPIContainer(container) ||
		isMeasureContainer(container) ||
		isSimpleMeasureContainer(container)
	);
}

const indicatorContainer = container.extend({
	payload: indicatorPayload
});

export type IndicatorContainer = z.infer<typeof indicatorContainer>;

export function isIndicatorContainer(
	container: AnyContainer | EmptyContainer
): container is IndicatorContainer {
	return container.payload.type === payloadTypes.enum.indicator;
}

const indicatorTemplateContainer = container.extend({
	payload: indicatorTemplatePayload
});

export type IndicatorTemplateContainer = z.infer<typeof indicatorTemplateContainer>;

export function isIndicatorTemplateContainer(
	container: AnyContainer | EmptyContainer
): container is IndicatorTemplateContainer {
	return container.payload.type === payloadTypes.enum.indicator_template;
}

const kpiContainer = container.extend({
	payload: kpiPayload
});

export type KPIContainer = z.infer<typeof kpiContainer>;

export function isKPIContainer(
	container: AnyContainer | EmptyContainer
): container is KPIContainer {
	return container.payload.type === payloadTypes.enum.kpi;
}

const measureContainer = container.extend({
	payload: measurePayload
});

export type MeasureContainer = z.infer<typeof measureContainer>;

export function isMeasureContainer(
	container: AnyContainer | EmptyContainer
): container is MeasureContainer {
	return container.payload.type === payloadTypes.enum.measure;
}

const modelContainer = container.extend({
	payload: modelPayload
});

export type ModelContainer = z.infer<typeof modelContainer>;

export function isModelContainer(
	container: AnyContainer | EmptyContainer
): container is ModelContainer {
	return container.payload.type === payloadTypes.enum.model;
}

const operationalGoalContainer = container.extend({
	payload: operationalGoalPayload
});

export type OperationalGoalContainer = z.infer<typeof operationalGoalContainer>;

export function isOperationalGoalContainer(
	container: AnyContainer | EmptyContainer
): container is OperationalGoalContainer {
	return container.payload.type === payloadTypes.enum.operational_goal;
}

export const organizationContainer = container.extend({
	payload: organizationPayload
});

export type OrganizationContainer = z.infer<typeof organizationContainer>;

export function isOrganizationContainer(
	container: AnyContainer | EmptyContainer
): container is OrganizationContainer {
	return container.payload.type === payloadTypes.enum.organization;
}

export const organizationalUnitContainer = container.extend({
	payload: organizationalUnitPayload
});

export type OrganizationalUnitContainer = z.infer<typeof organizationalUnitContainer>;

export function isOrganizationalUnitContainer(
	container: AnyContainer | EmptyContainer
): container is OrganizationalUnitContainer {
	return container.payload.type === payloadTypes.enum.organizational_unit;
}

export const pageContainer = container.extend({
	payload: pagePayload
});

export type PageContainer = z.infer<typeof pageContainer>;

export function isPageContainer(
	container: AnyContainer | EmptyContainer
): container is PageContainer {
	return container.payload.type === payloadTypes.enum.page;
}

const simpleMeasureContainer = container.extend({
	payload: simpleMeasurePayload
});

export type SimpleMeasureContainer = z.infer<typeof simpleMeasureContainer>;

export function isSimpleMeasureContainer(
	container: AnyContainer | EmptyContainer
): container is SimpleMeasureContainer {
	return container.payload.type === payloadTypes.enum.simple_measure;
}

const strategicGoalContainer = container.extend({
	payload: strategicGoalPayload
});

export type StrategicGoalContainer = z.infer<typeof strategicGoalContainer>;

export function isStrategicGoalContainer(
	container: AnyContainer | EmptyContainer
): container is StrategicGoalContainer {
	return container.payload.type === payloadTypes.enum.strategic_goal;
}

const strategyContainer = container.extend({
	payload: strategyPayload
});

export type StrategyContainer = z.infer<typeof strategyContainer>;

export function isStrategyContainer(
	container: AnyContainer | EmptyContainer
): container is StrategyContainer {
	return container.payload.type === payloadTypes.enum.strategy;
}

const textContainer = container.extend({
	payload: textPayload
});

export type TextContainer = z.infer<typeof textContainer>;

export function isTextContainer(
	container: AnyContainer | EmptyContainer
): container is TextContainer {
	return container.payload.type === payloadTypes.enum.text;
}

const internalStrategyContainer = container.extend({
	payload: internalStrategyPayload
});

export type InternalStrategyContainer = z.infer<typeof internalStrategyContainer>;

export function isInternalStrategyContainer(
	container: AnyContainer | EmptyContainer
): container is InternalStrategyContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.internal_strategy'];
}

const visionContainer = container.extend({
	payload: visionPayload
});

export type VisionContainer = z.infer<typeof visionContainer>;

export function isVisionContainer(
	container: AnyContainer | EmptyContainer
): container is VisionContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.vision'];
}

const internalObjectiveStrategicGoalContainer = container.extend({
	payload: internalObjectiveStrategicGoalPayload
});

export type InternalObjectiveStrategicGoalContainer = z.infer<
	typeof internalObjectiveStrategicGoalContainer
>;

export function isInternalObjectiveStrategicGoalContainer(
	container: AnyContainer | EmptyContainer
): container is InternalObjectiveStrategicGoalContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.strategic_goal'];
}

const milestoneContainer = container.extend({
	payload: milestonePayload
});

export type MilestoneContainer = z.infer<typeof milestoneContainer>;

export function isMilestoneContainer(
	container: AnyContainer | EmptyContainer
): container is MilestoneContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.milestone'];
}

const taskContainer = container.extend({
	payload: taskPayload
});

export type TaskContainer = z.infer<typeof taskContainer>;

export function isTaskContainer(
	container: AnyContainer | EmptyContainer
): container is TaskContainer {
	return container.payload.type === payloadTypes.enum['internal_objective.task'];
}

export type InternalObjectiveContainer =
	| InternalStrategyContainer
	| VisionContainer
	| InternalObjectiveStrategicGoalContainer
	| MilestoneContainer
	| TaskContainer;

export function isInternalObjectiveContainer(
	container: AnyContainer | EmptyContainer
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
		relation: z.array(partialRelation).default([])
	});

export type NewContainer = z.infer<typeof newContainer>;

const emptyContainer = newContainer.extend({
	payload: z.discriminatedUnion('type', [
		indicatorPayload.partial().merge(
			indicatorPayload.pick({
				audience: true,
				category: true,
				historicalValues: true,
				topic: true,
				type: true,
				visibility: true
			})
		),
		indicatorTemplatePayload.partial().merge(
			indicatorTemplatePayload.pick({
				category: true,
				topic: true,
				type: true,
				visibility: true
			})
		),
		kpiPayload.partial().merge(
			kpiPayload.pick({
				audience: true,
				effect: true,
				type: true,
				visibility: true
			})
		),
		measurePayload.partial().merge(
			measurePayload.pick({
				audience: true,
				boards: true,
				category: true,
				effect: true,
				topic: true,
				type: true,
				visibility: true
			})
		),
		modelPayload.partial().merge(
			modelPayload.pick({
				audience: true,
				category: true,
				objective: true,
				topic: true,
				type: true,
				visibility: true
			})
		),
		operationalGoalPayload.partial().merge(
			operationalGoalPayload.pick({
				audience: true,
				category: true,
				indicator: true,
				objective: true,
				topic: true,
				type: true,
				visibility: true
			})
		),
		organizationPayload
			.partial()
			.merge(
				organizationPayload.pick({ boards: true, default: true, type: true, visibility: true })
			),
		organizationalUnitPayload
			.partial()
			.merge(organizationalUnitPayload.pick({ boards: true, type: true, visibility: true })),
		pagePayload.partial().merge(pagePayload.pick({ type: true, visibility: true })),
		simpleMeasurePayload.partial().merge(
			simpleMeasurePayload.pick({
				audience: true,
				category: true,
				effect: true,
				progress: true,
				topic: true,
				type: true,
				visibility: true
			})
		),
		strategicGoalPayload.partial().merge(
			strategicGoalPayload.pick({
				audience: true,
				category: true,
				objective: true,
				topic: true,
				type: true,
				visibility: true
			})
		),
		strategyPayload.partial().merge(
			strategyPayload.pick({
				audience: true,
				category: true,
				topic: true,
				type: true,
				visibility: true
			})
		),
		textPayload.partial().merge(textPayload.pick({ type: true, visibility: true })),
		internalStrategyPayload
			.partial()
			.merge(internalStrategyPayload.pick({ audience: true, type: true, visibility: true })),
		visionPayload
			.partial()
			.merge(visionPayload.pick({ audience: true, objective: true, type: true, visibility: true })),
		internalObjectiveStrategicGoalPayload.partial().merge(
			internalObjectiveStrategicGoalPayload.pick({
				audience: true,
				type: true,
				visibility: true
			})
		),
		milestonePayload.partial().merge(
			milestonePayload.pick({
				audience: true,
				objective: true,
				progress: true,
				type: true,
				visibility: true
			})
		),
		taskPayload.partial().merge(taskPayload.pick({ type: true, visibility: true })),
		undefinedPayload.partial().merge(undefinedPayload.pick({ type: true, visibility: true }))
	])
});

export type EmptyContainer = z.infer<typeof emptyContainer>;

const emptyIndicatorContainer = emptyContainer.extend({
	payload: indicatorPayload.partial().merge(
		indicatorPayload.pick({
			audience: true,
			category: true,
			historicalValues: true,
			topic: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyIndicatorContainer = z.infer<typeof emptyIndicatorContainer>;

const emptyKPIContainer = emptyContainer.extend({
	payload: kpiPayload.partial().merge(
		kpiPayload.pick({
			audience: true,
			effect: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyKPIContainer = z.infer<typeof emptyKPIContainer>;

const emptyMeasureContainer = emptyContainer.extend({
	payload: measurePayload.partial().merge(
		measurePayload.pick({
			audience: true,
			boards: true,
			category: true,
			effect: true,
			topic: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyMeasureContainer = z.infer<typeof emptyMeasureContainer>;

const emptyModelContainer = emptyContainer.extend({
	payload: modelPayload.partial().merge(
		modelPayload.pick({
			audience: true,
			category: true,
			objective: true,
			topic: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyModelContainer = z.infer<typeof emptyModelContainer>;

const emptyOperationalGoalContainer = emptyContainer.extend({
	payload: operationalGoalPayload.partial().merge(
		operationalGoalPayload.pick({
			audience: true,
			category: true,
			indicator: true,
			objective: true,
			topic: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyOperationalGoalContainer = z.infer<typeof emptyOperationalGoalContainer>;

const emptyOrganizationContainer = newContainer.extend({
	payload: organizationPayload
		.partial()
		.merge(organizationPayload.pick({ boards: true, default: true, type: true, visibility: true }))
});

export type EmptyOrganizationContainer = z.infer<typeof emptyOrganizationContainer>;

const emptyOrganizationalUnitContainer = newContainer.extend({
	payload: organizationalUnitPayload
		.partial()
		.merge(organizationalUnitPayload.pick({ boards: true, type: true, visibility: true }))
});

export type EmptyOrganizationalUnitContainer = z.infer<typeof emptyOrganizationalUnitContainer>;

const emptyPageContainer = newContainer.extend({
	payload: pagePayload.partial().merge(pagePayload.pick({ type: true, visibility: true }))
});

export type EmptyPageContainer = z.infer<typeof emptyPageContainer>;

const emptySimpleMeasureContainer = emptyContainer.extend({
	payload: simpleMeasurePayload.partial().merge(
		simpleMeasurePayload.pick({
			audience: true,
			category: true,
			effect: true,
			progress: true,
			topic: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptySimpleMeasureContainer = z.infer<typeof emptySimpleMeasureContainer>;

const emptyStrategicGoalContainer = emptyContainer.extend({
	payload: strategicGoalPayload.partial().merge(
		strategicGoalPayload.pick({
			audience: true,
			category: true,
			objective: true,
			topic: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyStrategicGoalContainer = z.infer<typeof emptyStrategicGoalContainer>;

const emptyStrategyContainer = emptyContainer.extend({
	payload: strategyPayload.partial().merge(
		strategyPayload.pick({
			audience: true,
			category: true,
			topic: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyStrategyContainer = z.infer<typeof emptyStrategyContainer>;

const emptyTextContainer = emptyContainer.extend({
	payload: textPayload.partial().merge(textPayload.pick({ type: true, visibility: true }))
});

export type EmptyTextContainer = z.infer<typeof emptyTextContainer>;

const emptyInternalStrategyContainer = emptyContainer.extend({
	payload: internalStrategyPayload
		.partial()
		.merge(internalStrategyPayload.pick({ audience: true, type: true, visibility: true }))
});

export type EmptyInternalStrategyContainer = z.infer<typeof emptyInternalStrategyContainer>;

const emptyVisionContainer = emptyContainer.extend({
	payload: visionPayload
		.partial()
		.merge(visionPayload.pick({ audience: true, objective: true, type: true, visibility: true }))
});

export type EmptyVisionContainer = z.infer<typeof emptyVisionContainer>;

const emptyInternalObjectiveStrategicGoalContainer = emptyContainer.extend({
	payload: internalObjectiveStrategicGoalPayload.partial().merge(
		internalObjectiveStrategicGoalPayload.pick({
			audience: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyInternalObjectiveStrategicGoalContainer = z.infer<
	typeof emptyInternalObjectiveStrategicGoalContainer
>;

const emptyMilestoneContainer = emptyContainer.extend({
	payload: milestonePayload.partial().merge(
		milestonePayload.pick({
			audience: true,
			objective: true,
			progress: true,
			type: true,
			visibility: true
		})
	)
});

export type EmptyMilestoneContainer = z.infer<typeof emptyMilestoneContainer>;

const emptyTaskContainer = emptyContainer.extend({
	payload: taskPayload
		.partial()
		.merge(taskPayload.pick({ audience: true, type: true, visibility: true }))
});

export type EmptyTaskContainer = z.infer<typeof emptyTaskContainer>;

export const modifiedContainer = anyContainer
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

export function hasMember(user: { guid: string }) {
	return (container: AnyContainer) =>
		container.user.find(
			({ predicate, subject }) =>
				subject === user.guid && predicate === predicates.enum['is-member-of']
		);
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

export function isAdminOf(user: { guid: string }, container: AnyContainer) {
	return (
		container.user.findIndex(
			({ predicate, subject }) =>
				user.guid == subject && predicate == predicates.enum['is-admin-of']
		) > -1
	);
}

export function isAssignedTo(user: { guid: string }) {
	return (container: TaskContainer) => container.payload.assignee === user.guid;
}

export function containerOfType(
	payloadType: PayloadType,
	organization: string,
	organizationalUnit: string | null,
	realm: string
) {
	return emptyContainer.parse({
		payload: { type: payloadType },
		organization,
		organizational_unit: organizationalUnit,
		realm
	}) as EmptyContainer;
}

export function mayDelete(container: AnyContainer | EmptyContainer) {
	return (
		'guid' in container &&
		container.relation.filter(
			({ predicate, object }) =>
				(predicate == predicates.enum['is-part-of'] ||
					predicate == predicates.enum['is-part-of-measure']) &&
				'revision' in container &&
				object == container.revision
		).length == 0
	);
}

export function newIndicatorTemplateFromIndicator(container: IndicatorContainer) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { historicalValues, quantity, ...copiedPayload } = container.payload;
	return newContainer.parse({
		payload: { ...copiedPayload, type: payloadTypes.enum.indicator_template },
		organization: container.organization,
		organizational_unit: container.organization,
		realm: container.realm
	});
}

export function findAncestors<T extends AnyContainer>(container: T, containers: T[]): T[] {
	const parentRevision = container.relation.find(
		({ predicate, subject }) =>
			predicate == predicates.enum['is-part-of'] && subject == container.revision
	)?.object;
	if (!parentRevision) {
		return [];
	}

	const parent = containers.find(({ revision }) => revision == parentRevision);
	if (!parent) {
		return [];
	}

	return [parent, ...findAncestors(parent, containers)];
}

export function paramsFromFragment(url: URL) {
	return new URLSearchParams(url.hash.substring(1) ?? '');
}

export function overlayURL(url: URL, key: OverlayKey, guid: string) {
	const hashParams = paramsFromFragment(url);

	const newParams = new URLSearchParams([
		...Array.from(hashParams.entries()).filter(([k]) => !isOverlayKey(k)),
		[key, guid]
	]);

	return `#${newParams.toString()}`;
}

export function filterOrganizationalUnits(
	containers: Container[],
	url: URL,
	subordinateOrganizationalUnits: string[],
	currentOrganizationalUnit?: OrganizationalUnitContainer
) {
	return url.searchParams.has('related-to')
		? containers
		: containers.filter((c) => {
				const included = url.searchParams.has('includedChanged')
					? url.searchParams.getAll('included')
					: ['subordinate_organizational_units'];

				if (c.organizational_unit == currentOrganizationalUnit?.guid) {
					return true;
				}

				if (
					included.includes('subordinate_organizational_units') &&
					subordinateOrganizationalUnits.length == 0
				) {
					return true;
				}

				if (
					included.includes('subordinate_organizational_units') &&
					c.organizational_unit != null &&
					subordinateOrganizationalUnits.includes(c.organizational_unit)
				) {
					return true;
				}

				if (
					included.includes('superordinate_organizational_units') &&
					c.organizational_unit == null
				) {
					return true;
				}

				if (
					included.includes('superordinate_organizational_units') &&
					c.organizational_unit != null &&
					!subordinateOrganizationalUnits
						.filter((ou) => ou != currentOrganizationalUnit?.guid)
						.includes(c.organizational_unit)
				) {
					return true;
				}

				return false;
		  });
}
