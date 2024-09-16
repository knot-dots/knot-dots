import type { MongoAbility } from '@casl/ability';
import { z } from 'zod';

export type ContainerDetailViewTabKey =
	| 'basic-data'
	| 'effects'
	| 'historical-values'
	| 'metadata'
	| 'milestones'
	| 'resources';

export type ContainerFormTabKey = ContainerDetailViewTabKey;

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
	'chapters',
	'create',
	'edit',
	'edit-help',
	'indicators',
	'measure-monitoring',
	'measures',
	'members',
	'my-settings',
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
	'effect',
	'indicator',
	'indicator_template',
	'measure',
	'measure_result',
	'milestone',
	'model',
	'objective',
	'operational_goal',
	'organization',
	'organizational_unit',
	'page',
	'resolution',
	'resource',
	'simple_measure',
	'strategic_goal',
	'strategy',
	'task',
	'text',
	'undefined',
	'vision'
] as const;

export const payloadTypes = z.enum(payloadTypeValues);

export type PayloadType = z.infer<typeof payloadTypes>;

export function isPayloadType(value: unknown): value is PayloadType {
	return payloadTypeValues.includes(value as PayloadType);
}

export const chapterTypeOptions = [
	payloadTypes.enum.measure,
	payloadTypes.enum.model,
	payloadTypes.enum.operational_goal,
	payloadTypes.enum.resolution,
	payloadTypes.enum.simple_measure,
	payloadTypes.enum.strategic_goal,
	payloadTypes.enum.text,
	payloadTypes.enum.vision
];

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
	'is-admin-of',
	'is-collaborator-of',
	'is-consistent-with',
	'is-copy-of',
	'is-creator-of',
	'is-duplicate-of',
	'is-equivalent-to',
	'is-inconsistent-with',
	'is-measured-by',
	'is-member-of',
	'is-objective-for',
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

const resolutionStatusValues = [
	'resolution_status.draft',
	'resolution_status.in_force',
	'resolution_status.invalid'
] as const;

export const resolutionStatus = z.enum(resolutionStatusValues);

export type ResolutionStatus = z.infer<typeof resolutionStatus>;

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

const measureTypeValues = [
	'measure_type.app',
	'measure_type.artificial_intelligence',
	'measure_type.cyber_security',
	'measure_type.data_visualization',
	'measure_type.digital_platform',
	'measure_type.digital_twin',
	'measure_type.management_tools',
	'measure_type.network_infrastructure',
	'measure_type.planning',
	'measure_type.sensory',
	'measure_type.smart_grid',
	'measure_type.user_participation',
	'measure_type.virtual_reality'
] as const;

export const measureTypes = z.enum(measureTypeValues);

export type MeasureType = z.infer<typeof measureTypes>;

const indicatorTypeValues = [
	'indicator_type.impact',
	'indicator_type.key',
	'indicator_type.performance'
] as const;

export const indicatorTypes = z.enum(indicatorTypeValues);

export type IndicatorType = z.infer<typeof indicatorTypes>;

const topicValues = [
	'topic.citizen_participation',
	'topic.cityscape',
	'topic.civil_protection',
	'topic.climate_change_mitigation_and_adaptation',
	'topic.construction_and_housing',
	'topic.culture',
	'topic.demographics',
	'topic.digital_municipality',
	'topic.digital_urban_planning',
	'topic.economy',
	'topic.education',
	'topic.energy',
	'topic.environment',
	'topic.health',
	'topic.labor_and_social_affairs',
	'topic.leisure',
	'topic.living',
	'topic.mobility',
	'topic.quality_of_life',
	'topic.resilience',
	'topic.security',
	'topic.social_justice',
	'topic.tourism',
	'topic.waste_and_emissions',
	'topic.water'
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
	'indicator_category.mpsc',
	'indicator_category.sdg',
	'indicator_category.custom'
] as const;

export const indicatorCategories = z.enum(indicatorCategoryValues);

export type IndicatorCategory = z.infer<typeof indicatorCategories>;

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

export const taskPriority = z.object({
	priority: z.number().int(),
	task: z.string().uuid()
});

export type TaskPriority = z.infer<typeof taskPriority>;

export const visibility = z.enum(['creator', 'members', 'public']);

export const boards = z.enum([
	'board.indicators',
	'board.measure_monitoring',
	'board.organizational_units',
	'board.tasks'
]);

const basePayload = z
	.object({
		audience: z.array(audience).default([audience.enum['audience.public']]),
		category: z.array(sustainableDevelopmentGoals).default([]),
		description: z.string().trim().optional(),
		summary: z.string().trim().max(200).optional(),
		title: z.string().trim(),
		topic: z.array(topics).default([]),
		visibility: visibility.default('members')
	})
	.strict();

const indicatorPayload = basePayload.extend({
	historicalValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
	historicalValuesIntro: z.string().trim().optional(),
	indicatorCategory: z.array(indicatorCategories).default([]),
	indicatorType: z.array(indicatorTypes).default([]),
	measureType: z.array(measureTypes).default([]),
	measuresIntro: z.string().trim().optional(),
	objectivesIntro: z.string().trim().optional(),
	quantity: z.string(),
	type: z.literal(payloadTypes.enum.indicator),
	unit: z.string()
});

const initialIndicatorPayload = indicatorPayload.partial({
	quantity: true,
	title: true,
	unit: true
});

const indicatorTemplatePayload = indicatorPayload
	.extend({
		type: z.literal(payloadTypes.enum.indicator_template)
	})
	.omit({ historicalValues: true, quantity: true });

const initialIndicatorTemplatePayload = indicatorTemplatePayload.partial({
	title: true,
	unit: true
});

const measurePayload = basePayload
	.extend({
		annotation: z.string().trim().optional(),
		comment: z.string().trim().optional(),
		endDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		indicatorContribution: z.record(z.string().uuid(), z.coerce.number().nonnegative()).optional(),
		indicatorContributionAchieved: z
			.record(z.string().uuid(), z.coerce.number().nonnegative())
			.optional(),
		measureType: z.array(measureTypes).default([]),
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
		result: z.string().trim().optional(),
		startDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		status: status.default(status.enum['status.idea']),
		template: z.boolean().default(false),
		type: z.literal(payloadTypes.enum.measure)
	})
	.strict();

const initialMeasurePayload = measurePayload.partial({ title: true });

const modelPayload = basePayload
	.extend({
		type: z.literal(payloadTypes.enum.model)
	})
	.strict();

const initialModelPayload = modelPayload.partial({ title: true });

const objectivePayload = basePayload.omit({ category: true, summary: true, topic: true }).extend({
	type: z.literal(payloadTypes.enum.objective),
	wantedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([])
});

const initialObjectivePayload = objectivePayload.partial({ title: true });

const operationalGoalPayload = basePayload
	.extend({
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		indicator: z.array(indicator).max(1).default([]),
		progress: z.number().nonnegative().optional(),
		type: z.literal(payloadTypes.enum.operational_goal)
	})
	.strict();

const initialOperationalGoalPayload = operationalGoalPayload.partial({ title: true });

const resolutionPayload = basePayload.extend({
	resolutionStatus: resolutionStatus.default(resolutionStatus.enum['resolution_status.draft']),
	type: z.literal(payloadTypes.enum.resolution),
	validFrom: z
		.string()
		.refine((v) => z.coerce.date().safeParse(v))
		.optional(),
	validUntil: z
		.string()
		.refine((v) => z.coerce.date().safeParse(v))
		.optional()
});

const initialResolutionPayload = resolutionPayload.partial({ title: true });

const simpleMeasurePayload = basePayload
	.omit({ summary: true })
	.extend({
		annotation: z.string().trim().optional(),
		endDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		file: z.array(z.tuple([z.string().url(), z.string()])).default([]),
		measureType: z.array(measureTypes).default([]),
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

const initialSimpleMeasurePayload = simpleMeasurePayload.partial({ title: true });

const strategicGoalPayload = basePayload
	.extend({
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		type: z.literal(payloadTypes.enum.strategic_goal)
	})
	.strict();

const initialStrategicGoalPayload = strategicGoalPayload.partial({ title: true });

const strategyPayload = basePayload
	.omit({
		description: true,
		summary: true
	})
	.extend({
		chapterType: z.array(payloadTypes).default(chapterTypeOptions),
		image: z.string().url().optional(),
		level: levels,
		pdf: z.array(z.tuple([z.string().url(), z.string()])).default([]),
		strategyType: strategyTypes,
		type: z.literal(payloadTypes.enum.strategy)
	})
	.strict();

const initialStrategyPayload = strategyPayload.partial({
	level: true,
	strategyType: true,
	title: true
});

const visionPayload = basePayload
	.extend({
		type: z.literal(payloadTypes.enum.vision)
	})
	.strict();

const initialVisionPayload = visionPayload.partial({ title: true });

const measureMonitoringBasePayload = z.object({
	audience: z.array(audience).default([audience.enum['audience.public']]),
	description: z.string().trim().optional(),
	summary: z.string().trim().max(200).optional(),
	title: z.string(),
	visibility: visibility.default('members')
});

const effectPayload = measureMonitoringBasePayload.omit({ summary: true }).extend({
	achievedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
	plannedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
	type: z.literal(payloadTypes.enum.effect)
});

const initialEffectPayload = effectPayload.partial({ title: true });

const measureResultPayload = measureMonitoringBasePayload
	.extend({
		type: z.literal(payloadTypes.enum.measure_result)
	})
	.strict();

const initialMeasureResultPayload = measureResultPayload.partial({ title: true });

const milestonePayload = measureMonitoringBasePayload
	.extend({
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		progress: z.number().nonnegative().default(0),
		type: z.literal(payloadTypes.enum.milestone)
	})
	.strict();

const initialMilestonePayload = milestonePayload.partial({ title: true });

const resourcePayload = measureMonitoringBasePayload
	.omit({ description: true, summary: true })
	.extend({
		amount: z.coerce.number(),
		fulfillmentDate: z.string().refine((v) => z.coerce.date().safeParse(v)),
		type: z.literal(payloadTypes.enum.resource),
		unit: z.string()
	})
	.strict();

const initialResourcePayload = resourcePayload.partial({
	amount: true,
	fulfillmentDate: true,
	title: true,
	unit: true
});

const taskPayload = measureMonitoringBasePayload
	.omit({ audience: true, summary: true })
	.extend({
		assignee: z.string().uuid().optional(),
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		taskCategory: taskCategories.default(taskCategories.enum['task_category.default']),
		taskStatus: taskStatus.default(taskStatus.enum['task_status.idea']),
		type: z.literal(payloadTypes.enum.task)
	})
	.strict();

const initialTaskPayload = taskPayload.partial({ title: true });

const organizationPayload = z.object({
	boards: z.array(boards).default([]),
	default: z.boolean().default(false),
	description: z.string().trim().optional(),
	image: z.string().url().optional(),
	name: z.string().trim(),
	organizationCategory: organizationCategories.optional(),
	type: z.literal(payloadTypes.enum.organization),
	visibility: visibility.default('members')
});

const initialOrganizationPayload = organizationPayload.partial({ name: true });

const organizationalUnitPayload = z.object({
	boards: z.array(boards).default([]),
	description: z.string().trim().optional(),
	image: z.string().url().optional(),
	level: z.number().int().positive().default(1),
	name: z.string().trim(),
	type: z.literal(payloadTypes.enum.organizational_unit),
	visibility: visibility.default('members')
});

const initialOrganizationalUnitPayload = organizationalUnitPayload.partial({ name: true });

const pagePayload = z.object({
	body: z.string().trim(),
	slug: z.string(),
	title: z.string().trim(),
	type: z.literal(payloadTypes.enum.page),
	visibility: visibility.default('public')
});

const initialPagePayload = pagePayload.partial({ body: true, slug: true, title: true });

const textPayload = z
	.object({
		audience: z.array(audience).default([audience.enum['audience.public']]),
		body: z.string().trim().optional(),
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.text),
		visibility: visibility.default('members')
	})
	.strict();

const initialTextPayload = textPayload.partial({ body: true, title: true });

const undefinedPayload = z
	.object({
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.undefined),
		visibility: visibility.default('members')
	})
	.strict();

const initialUndefinedPayload = undefinedPayload.partial({ title: true });

export const container = z.object({
	guid: z.string().uuid(),
	managed_by: z.string().uuid(),
	organization: z.string().uuid(),
	organizational_unit: z.string().uuid().nullable(),
	payload: z.discriminatedUnion('type', [
		effectPayload,
		indicatorPayload,
		indicatorTemplatePayload,
		measurePayload,
		measureResultPayload,
		milestonePayload,
		modelPayload,
		objectivePayload,
		operationalGoalPayload,
		pagePayload,
		resolutionPayload,
		resourcePayload,
		simpleMeasurePayload,
		strategicGoalPayload,
		strategyPayload,
		taskPayload,
		textPayload,
		visionPayload
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
		effectPayload,
		indicatorPayload,
		indicatorTemplatePayload,
		measurePayload,
		measureResultPayload,
		milestonePayload,
		modelPayload,
		objectivePayload,
		operationalGoalPayload,
		organizationPayload,
		organizationalUnitPayload,
		pagePayload,
		resolutionPayload,
		resourcePayload,
		simpleMeasurePayload,
		strategicGoalPayload,
		strategyPayload,
		taskPayload,
		textPayload,
		undefinedPayload,
		visionPayload
	])
});

export type AnyContainer = z.infer<typeof anyContainer>;

export const containerWithObjective = container.extend({
	payload: z.discriminatedUnion('type', [
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
		isModelContainer(container) ||
		isOperationalGoalContainer(container) ||
		isStrategicGoalContainer(container) ||
		isVisionContainer(container)
	);
}

export const containerWithEffect = container.extend({
	payload: z.discriminatedUnion('type', [measurePayload, simpleMeasurePayload])
});

export type ContainerWithEffect = z.infer<typeof containerWithEffect>;

export function isContainerWithEffect(
	container: AnyContainer | EmptyContainer
): container is ContainerWithEffect {
	return isMeasureContainer(container) || isSimpleMeasureContainer(container);
}

const effectContainer = container.extend({
	payload: effectPayload
});

export type EffectContainer = z.infer<typeof effectContainer>;

export function isEffectContainer(
	container: AnyContainer | EmptyContainer
): container is EffectContainer {
	return container.payload.type === payloadTypes.enum.effect;
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

const objectiveContainer = container.extend({
	payload: objectivePayload
});

export type ObjectiveContainer = z.infer<typeof objectiveContainer>;

export function isObjectiveContainer(
	container: AnyContainer | EmptyContainer
): container is ObjectiveContainer {
	return container.payload.type === payloadTypes.enum.objective;
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

const resolutionContainer = container.extend({
	payload: resolutionPayload
});

export type ResolutionContainer = z.infer<typeof resolutionContainer>;

export function isResolutionContainer(
	container: AnyContainer | EmptyContainer
): container is ResolutionContainer {
	return container.payload.type === payloadTypes.enum.resolution;
}

const resourceContainer = container.extend({
	payload: resourcePayload
});

export type ResourceContainer = z.infer<typeof resourceContainer>;

export function isResourceContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceContainer {
	return container.payload.type === payloadTypes.enum.resource;
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

const visionContainer = container.extend({
	payload: visionPayload
});

export type VisionContainer = z.infer<typeof visionContainer>;

export function isVisionContainer(
	container: AnyContainer | EmptyContainer
): container is VisionContainer {
	return container.payload.type === payloadTypes.enum.vision;
}

const measureResultContainer = container.extend({
	payload: measureResultPayload
});

export type MeasureResultContainer = z.infer<typeof measureResultContainer>;

export function isMeasureResultContainer(
	container: AnyContainer | EmptyContainer
): container is MeasureResultContainer {
	return container.payload.type === payloadTypes.enum.measure_result;
}

const milestoneContainer = container.extend({
	payload: milestonePayload
});

export type MilestoneContainer = z.infer<typeof milestoneContainer>;

export function isMilestoneContainer(
	container: AnyContainer | EmptyContainer
): container is MilestoneContainer {
	return container.payload.type === payloadTypes.enum.milestone;
}

const taskContainer = container.extend({
	payload: taskPayload
});

export type TaskContainer = z.infer<typeof taskContainer>;

export function isTaskContainer(
	container: AnyContainer | EmptyContainer
): container is TaskContainer {
	return container.payload.type === payloadTypes.enum.task;
}

export type MeasureMonitoringContainer =
	| EffectContainer
	| MeasureResultContainer
	| MilestoneContainer
	| TaskContainer;

export function isMeasureMonitoringContainer(
	container: AnyContainer | EmptyContainer
): container is MeasureMonitoringContainer {
	return (
		isEffectContainer(container) ||
		isMeasureResultContainer(container) ||
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
		initialEffectPayload,
		initialIndicatorPayload,
		initialIndicatorTemplatePayload,
		initialMeasurePayload,
		initialModelPayload,
		initialObjectivePayload,
		initialOperationalGoalPayload,
		initialOrganizationPayload,
		initialOrganizationalUnitPayload,
		initialPagePayload,
		initialResolutionPayload,
		initialResourcePayload,
		initialSimpleMeasurePayload,
		initialStrategicGoalPayload,
		initialStrategyPayload,
		initialTextPayload,
		initialVisionPayload,
		initialMeasureResultPayload,
		initialMilestonePayload,
		initialTaskPayload,
		initialUndefinedPayload
	])
});

export type EmptyContainer = z.infer<typeof emptyContainer>;

const emptyEffectContainer = emptyContainer.extend({
	payload: initialEffectPayload
});

export type EmptyEffectContainer = z.infer<typeof emptyEffectContainer>;

const emptyIndicatorContainer = emptyContainer.extend({
	payload: initialIndicatorPayload
});

export type EmptyIndicatorContainer = z.infer<typeof emptyIndicatorContainer>;

const emptyMeasureContainer = emptyContainer.extend({
	payload: initialMeasurePayload
});

export type EmptyMeasureContainer = z.infer<typeof emptyMeasureContainer>;

const emptyModelContainer = emptyContainer.extend({
	payload: initialModelPayload
});

export type EmptyModelContainer = z.infer<typeof emptyModelContainer>;

const emptyObjectiveContainer = emptyContainer.extend({
	payload: initialObjectivePayload
});

export type EmptyObjectiveContainer = z.infer<typeof emptyObjectiveContainer>;

const emptyOperationalGoalContainer = emptyContainer.extend({
	payload: initialOperationalGoalPayload
});

export type EmptyOperationalGoalContainer = z.infer<typeof emptyOperationalGoalContainer>;

const emptyOrganizationContainer = newContainer.extend({
	payload: initialOrganizationPayload
});

export type EmptyOrganizationContainer = z.infer<typeof emptyOrganizationContainer>;

const emptyOrganizationalUnitContainer = newContainer.extend({
	payload: initialOrganizationalUnitPayload
});

export type EmptyOrganizationalUnitContainer = z.infer<typeof emptyOrganizationalUnitContainer>;

const emptyPageContainer = newContainer.extend({
	payload: initialPagePayload
});

export type EmptyPageContainer = z.infer<typeof emptyPageContainer>;

const emptyResolutionContainer = emptyContainer.extend({
	payload: initialResolutionPayload
});

export type EmptyResolutionContainer = z.infer<typeof emptyResolutionContainer>;

const emptyResourceContainer = emptyContainer.extend({
	payload: initialResourcePayload
});

export type EmptyResourceContainer = z.infer<typeof emptyResourceContainer>;

const emptySimpleMeasureContainer = emptyContainer.extend({
	payload: initialSimpleMeasurePayload
});

export type EmptySimpleMeasureContainer = z.infer<typeof emptySimpleMeasureContainer>;

const emptyStrategicGoalContainer = emptyContainer.extend({
	payload: initialStrategicGoalPayload
});

export type EmptyStrategicGoalContainer = z.infer<typeof emptyStrategicGoalContainer>;

const emptyStrategyContainer = emptyContainer.extend({
	payload: initialStrategyPayload
});

export type EmptyStrategyContainer = z.infer<typeof emptyStrategyContainer>;

const emptyTextContainer = emptyContainer.extend({
	payload: initialTextPayload
});

export type EmptyTextContainer = z.infer<typeof emptyTextContainer>;

const emptyVisionContainer = emptyContainer.extend({
	payload: initialVisionPayload
});

export type EmptyVisionContainer = z.infer<typeof emptyVisionContainer>;

const emptyMeasureResultContainer = emptyContainer.extend({
	payload: initialMeasureResultPayload
});

export type EmptyMeasureResultContainer = z.infer<typeof emptyMeasureResultContainer>;

const emptyMilestoneContainer = emptyContainer.extend({
	payload: initialMilestonePayload
});

export type EmptyMilestoneContainer = z.infer<typeof emptyMilestoneContainer>;

const emptyTaskContainer = emptyContainer.extend({
	payload: initialTaskPayload
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

export const user = z.object({
	family_name: z.string().max(32).default(''),
	given_name: z.string().max(32).default(''),
	guid: z.string().uuid(),
	realm: z.string().max(1024)
});

export type User = z.infer<typeof user>;

export function displayName(user: User) {
	return `${user.given_name} ${user.family_name}`;
}

export const keycloakUser = z.object({
	email: z.string().email(),
	emailVerified: z.boolean(),
	enabled: z.boolean(),
	firstName: z.string().optional(),
	id: z.string().uuid(),
	lastName: z.string().optional()
});

export type KeycloakUser = z.infer<typeof keycloakUser>;

export const newUser = z.object({
	email: z.string().email(),
	container: anyContainer
});

export type NewUser = z.infer<typeof newUser>;

export function isPartOfMeasure(container: { relation: PartialRelation[]; revision: number }) {
	return function (candidate: AnyContainer) {
		return (
			container.relation.findIndex(
				(r) =>
					r.predicate === predicates.enum['is-part-of-measure'] &&
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

export function isCollaboratorOf(user: { guid: string }, container: AnyContainer) {
	return (
		container.user.findIndex(
			({ predicate, subject }) =>
				user.guid == subject && predicate == predicates.enum['is-collaborator-of']
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
	managedBy: string,
	realm: string
) {
	return emptyContainer.parse({
		managed_by: managedBy,
		organization,
		organizational_unit: organizationalUnit,
		payload: { type: payloadType },
		realm
	}) as EmptyContainer;
}

export function mayDelete(container: AnyContainer | EmptyContainer, ability: MongoAbility) {
	return (
		'guid' in container &&
		container.relation.filter(
			({ predicate, object }) =>
				(predicate == predicates.enum['is-part-of'] ||
					predicate == predicates.enum['is-part-of-measure']) &&
				'revision' in container &&
				object == container.revision
		).length == 0 &&
		ability.can('delete', container)
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

export function findDescendants<T extends AnyContainer>(container: T, containers: T[]): T[] {
	const children = containers.filter(
		({ relation, revision }) =>
			relation.findIndex(
				({ object, predicate }) =>
					predicate == predicates.enum['is-part-of'] &&
					object == container.revision &&
					object != revision
			) > -1
	);

	const descendants = [...children];

	for (const child of children) {
		descendants.push(...findDescendants(child, containers));
	}

	return descendants;
}

export function findParentObjectives(containers: Container[]): ObjectiveContainer[] {
	const roots = new Set<Container>();
	const parentObjectives = [] as ObjectiveContainer[];

	for (const container of containers) {
		const ancestors = findAncestors(container, containers);

		if (ancestors.length > 0) {
			roots.add(ancestors[ancestors.length - 1]);
		}
	}

	for (const container of roots) {
		const descendants = findDescendants(container, containers);
		const objectives = descendants.filter(isPartOf(container)).filter(isObjectiveContainer);

		if (objectives.length > 0) {
			parentObjectives.push(...objectives);
		} else {
			parentObjectives.push(...findParentObjectives(descendants));
		}
	}

	return Array.from(parentObjectives);
}

export function findOverallObjective(container: IndicatorContainer, containers: Container[]) {
	return containers
		.filter(isObjectiveContainer)
		.find(
			({ relation }) =>
				relation.some(
					({ object, predicate }) =>
						predicate == predicates.enum['is-objective-for'] && object == container.revision
				) && relation.findIndex(({ predicate }) => predicate == predicates.enum['is-part-of']) == -1
		);
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

				if (included.includes('subordinate_organizational_units') && !currentOrganizationalUnit) {
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

export function getCreator(revision: AnyContainer) {
	return revision.user
		.filter(({ predicate }) => predicate == predicates.enum['is-creator-of'])
		.map(({ subject }) => subject);
}

export function getManagedBy(container: AnyContainer, candidates: AnyContainer[]) {
	return candidates.find(({ guid }) => guid === container.managed_by);
}

export function hasHistoricalValues(container: IndicatorContainer | EmptyIndicatorContainer) {
	return container.payload.historicalValues.length > 0;
}

export function createCopyOf(
	container: Container,
	organization: string,
	organizationalUnit: string | null
) {
	const copy = containerOfType(
		container.payload.type,
		organization,
		organizationalUnit,
		container.managed_by,
		container.realm
	);

	if (isMeasureContainer(container)) {
		copy.payload = { ...container.payload, template: false };
	} else if (isTaskContainer(container)) {
		copy.payload = {
			...container.payload,
			assignee: undefined,
			taskStatus: taskStatus.enum['task_status.idea']
		};
	} else if (isIndicatorContainer(container)) {
		copy.payload = { ...container.payload, historicalValues: [] };
	} else if (isEffectContainer(container)) {
		copy.payload = { ...container.payload, achievedValues: [] };
	} else {
		copy.payload = { ...container.payload };
	}

	copy.payload = {
		...copy.payload,
		...('fulfillmentDate' in container.payload ? { fulfillmentDate: undefined } : undefined)
	};

	copy.relation.push({
		object: container.revision,
		predicate: predicates.enum['is-copy-of'],
		position: 0
	});

	return copy;
}
