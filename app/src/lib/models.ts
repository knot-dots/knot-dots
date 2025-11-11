import { env } from '$env/dynamic/public';
import type { MongoAbility } from '@casl/ability';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';

export type ApplicationState = {
	containerDetailView: {
		editable?: boolean;
		mode?: 'view_mode.preview' | 'view_mode.table';
	};
};

export const overlayKey = z.enum([
	'chapters',
	'create',
	'indicator-catalog',
	'new-indicator-catalog',
	'indicators',
	'measure-monitoring',
	'measures',
	'members',
	'program',
	'relate',
	'relations',
	'table',
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
	'actual_data',
	'administrative_area_basic_data',
	'effect',
	'effect_collection',
	'file_collection',
	'goal',
	'goal_collection',
	'indicator',
	'indicator_collection',
	'indicator_template',
	'knowledge',
	'map',
	'measure',
	'measure_collection',
	'objective',
	'objective_collection',
	'organization',
	'organizational_unit',
	'page',
	'program',
	'program_collection',
	'resource',
	'resource_collection',
	'rule',
	'simple_measure',
	'task',
	'task_collection',
	'text',
	'undefined'
] as const;

export const payloadTypes = z.enum(payloadTypeValues);

export type PayloadType = z.infer<typeof payloadTypes>;

export function isPayloadType(value: unknown): value is PayloadType {
	return payloadTypeValues.includes(value as PayloadType);
}

export const chapterTypeOptions = [
	payloadTypes.enum.goal,
	payloadTypes.enum.knowledge,
	payloadTypes.enum.measure,
	payloadTypes.enum.rule,
	payloadTypes.enum.simple_measure,
	payloadTypes.enum.text
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
	'contributes-to',
	'is-admin-of',
	'is-affected-by',
	'is-collaborator-of',
	'is-concrete-target-of',
	'is-consistent-with',
	'is-copy-of',
	'is-creator-of',
	'is-duplicate-of',
	'is-equivalent-to',
	'is-head-of',
	'is-inconsistent-with',
	'is-measured-by',
	'is-member-of',
	'is-objective-for',
	'is-part-of',
	'is-part-of-measure',
	'is-part-of-program',
	'is-prerequisite-for',
	'is-section-of',
	'is-sub-target-of',
	'is-superordinate-of'
] as const;

export const predicates = z.enum(predicateValues);

export type Predicate = z.infer<typeof predicates>;

const goalStatusValues = [
	'goal_status.idea',
	'goal_status.in_planning',
	'goal_status.adopted',
	'goal_status.achieved',
	'goal_status.rejected'
] as const;

export const goalStatus = z.enum(goalStatusValues);

export type GoalStatus = z.infer<typeof goalStatus>;

const statusValues = [
	'status.idea',
	'status.in_planning',
	'status.adopted',
	'status.in_implementation',
	'status.in_operation',
	'status.done',
	'status.rejected'
] as const;

export const status = z.enum(statusValues);

export type Status = z.infer<typeof status>;

const programStatusValues = [
	'program_status.idea',
	'program_status.in_planning',
	'program_status.adopted',
	'program_status.in_implementation',
	'program_status.done',
	'program_status.rejected'
] as const;

export const programStatus = z.enum(programStatusValues);

export type ProgramStatus = z.infer<typeof programStatus>;

const ruleStatusValues = [
	'rule_status.idea',
	'rule_status.in_planning',
	'rule_status.adopted',
	'rule_status.rejected'
] as const;

export const ruleStatus = z.enum(ruleStatusValues);

export type RuleStatus = z.infer<typeof ruleStatus>;

const taskStatusValues = [
	'task_status.idea',
	'task_status.in_planning',
	'task_status.in_progress',
	'task_status.done',
	'task_status.rejected'
] as const;

export const taskStatus = z.enum(taskStatusValues);

export type TaskStatus = z.infer<typeof taskStatus>;

const programTypeValues = [
	'program_type.misc',
	'program_type.mobility',
	'program_type.sustainability',
	'program_type.smart_city',
	'program_type.isek',
	'program_type.report',
	'program_type.set_of_rules',
	'program_type.package_of_measures',
	'program_type.funding_program',
	'program_type.guide',
	'program_type.agenda'
] as const;

export const programTypes = z.enum(programTypeValues);

export type ProgramType = z.infer<typeof programTypes>;

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

const goalTypeValues = [
	'goal_type.vision',
	'goal_type.model',
	'goal_type.long_term_goal',
	'goal_type.topic_area',
	'goal_type.policy_field',
	'goal_type.strategic_goal',
	'goal_type.objective',
	'goal_type.key_result',
	'goal_type.key_performance_indicator',
	'goal_type.operational_goal',
	'goal_type.set_of_measures',
	'goal_type.profile',
	'goal_type.milestone',
	'goal_type.sprint',
	'goal_type.input',
	'goal_type.output',
	'goal_type.outcome',
	'goal_type.impact'
] as const;

export const goalType = z.enum(goalTypeValues);

export type GoalType = z.infer<typeof goalType>;

const organizationalUnitTypeValues = ['organizational_unit_type.administrative_area'] as const;

export const organizationalUnitType = z.enum(organizationalUnitTypeValues);

export type OrganizationalUnitType = z.infer<typeof organizationalUnitType>;

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

const policyFieldBNKValues = [
	'policy_field_bnk.climate',
	'policy_field_bnk.circular_economy',
	'policy_field_bnk.environment',
	'policy_field_bnk.spatial_development',
	'policy_field_bnk.housing',
	'policy_field_bnk.mobility',
	'policy_field_bnk.social_justice',
	'policy_field_bnk.education_and_culture',
	'policy_field_bnk.health',
	'policy_field_bnk.decent_work',
	'policy_field_bnk.global_cooperation'
] as const;

export const policyFieldBNK = z.enum(policyFieldBNKValues);

export type PolicyFieldBNK = z.infer<typeof policyFieldBNK>;

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
	'indicator_category.fgk',
	'indicator_category.kpi',
	'indicator_category.mpsc',
	'indicator_category.sdg',
	'indicator_category.wegweiser_kommune',
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
	'unit.euro',
	'unit.euro_per_capita',
	'unit.euro_per_square_meter',
	'unit.kilogram_per_capita',
	'unit.kilogram_per_hectare',
	'unit.kilowatt',
	'unit.watt_per_capita',
	'unit.kilowatt_hour',
	'unit.megawatt_hour_per_year',
	'unit.meter',
	'unit.kilometer',
	'unit.n',
	'unit.percent',
	'unit.per_1000',
	'unit.per_100000',
	'unit.square_meter',
	'unit.square_meter_per_capita',
	'unit.square_kilometer_per_capita',
	'unit.cubic_meter',
	'unit.liter_per_capita_per_day',
	'unit.microgram_per_cubic_meter',
	'unit.ton',
	'unit.ton_per_capita',
	'unit.minute',
	'unit.year'
] as const;

export const units = z.enum(unitValues);

const audienceValues = [
	'audience.administration',
	'audience.citizens',
	'audience.companies',
	'audience.entire_group',
	'audience.science',
	'audience.urban_society',
	'audience.voluntary_work_associations_ngos'
] as const;

export const audience = z.enum(audienceValues);

export type Audience = z.infer<typeof audience>;

const editorialStateValues = [
	'editorial_state.draft',
	'editorial_state.requires_post_qualification',
	'editorial_state.in_post_qualification',
	'editorial_state.approved',
	'editorial_state.rejected'
] as const;

export const editorialState = z.enum(editorialStateValues);

export type EditorialState = z.infer<typeof editorialState>;

export const relation = z.object({
	object: z.string().uuid(),
	position: z.number().int().nonnegative(),
	predicate: z.string().max(128),
	subject: z.string().uuid()
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

export const taskPriority = z.object({
	priority: z.number().int(),
	task: z.string().uuid()
});

export type TaskPriority = z.infer<typeof taskPriority>;

export const visibility = z.enum(['creator', 'members', 'organization', 'public']);

export const boards = z.enum([
	'board.indicators',
	'board.measure_monitoring',
	'board.organizational_units',
	'board.tasks'
]);

export const administrativeTypes = z.enum([
	'administrative_type.municipality',
	'administrative_type.rural_district',
	'administrative_type.urban_district'
]);

export const benefit = z.enum(['benefit.low', 'benefit.medium', 'benefit.high']);

export type Benefit = z.infer<typeof benefit>;

const basePayload = z
	.object({
		aiSuggestion: z.boolean().default(false),
		audience: z.array(audience).default([audience.enum['audience.citizens']]),
		category: z.array(sustainableDevelopmentGoals).default([]),
		description: z.string().trim().optional(),
		editorialState: editorialState.optional(),
		policyFieldBNK: z.array(policyFieldBNK).default([]),
		summary: z.string().trim().max(200).optional(),
		title: z.string().trim(),
		topic: z.array(topics).default([]),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const actualDataPayload = z.object({
	audience: z.array(audience).default([audience.enum['audience.citizens']]),
	indicator: z.string().uuid(),
	source: z.string().optional(),
	title: z.string(),
	type: z.literal(payloadTypes.enum.actual_data),
	values: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
	visibility: visibility.default(visibility.enum['organization'])
});

const initialActualDataPayload = actualDataPayload.partial({ indicator: true, title: true });

const administrativeAreaBasicDataPayload = z.object({
	title: z
		.string()
		.readonly()
		.default(() => unwrapFunctionStore(_)('administrative_area.basic_data')),
	type: z.literal(payloadTypes.enum.administrative_area_basic_data),
	visibility: visibility.default(visibility.enum['organization'])
});

const initialAdministrativeAreaBasicDataPayload = administrativeAreaBasicDataPayload;

const fileCollectionPayload = z
	.object({
		file: z
			.array(
				z.object({
					name: z.string(),
					size: z.number().int().nonnegative(),
					type: z.string(),
					url: z.string().url()
				})
			)
			.default([]),
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('files')),
		type: z.literal(payloadTypes.enum.file_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialFileCollectionPayload = fileCollectionPayload;

const goalPayload = basePayload.extend({
	fulfillmentDate: z
		.string()
		.refine((v) => z.coerce.date().safeParse(v))
		.optional(),
	goalStatus: goalStatus.default(goalStatus.enum['goal_status.idea']),
	goalType: goalType.optional(),
	hierarchyLevel: z.number().int().gte(1).lte(6).default(1),
	progress: z.number().nonnegative().optional(),
	type: z.literal(payloadTypes.enum.goal)
});

const initialGoalPayload = goalPayload.partial({
	goalType: true,
	title: true
});

const goalCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('goals')),
		type: z.literal(payloadTypes.enum.goal_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialGoalCollectionPayload = goalCollectionPayload;

const indicatorPayload = basePayload.extend({
	externalReference: z.string().url().optional(),
	historicalValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
	indicatorCategory: z.array(indicatorCategories).default([]),
	indicatorType: z.array(indicatorTypes).default([]),
	measureType: z.array(measureTypes).default([]),
	quantity: z.string(),
	type: z.literal(payloadTypes.enum.indicator),
	unit: z.string()
});

const initialIndicatorPayload = indicatorPayload.partial({
	quantity: true,
	title: true,
	unit: true
});

const indicatorCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('indicators')),
		type: z.literal(payloadTypes.enum.indicator_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialIndicatorCollectionPayload = indicatorCollectionPayload;

const indicatorTemplatePayload = indicatorPayload
	.extend({
		type: z.literal(payloadTypes.enum.indicator_template)
	})
	.omit({ historicalValues: true, quantity: true });

const initialIndicatorTemplatePayload = indicatorTemplatePayload.partial({
	title: true,
	unit: true
});

const knowledgePayload = basePayload
	.extend({ type: z.literal(payloadTypes.enum.knowledge) })
	.strict();

const initialKnowledgePayload = knowledgePayload.partial({ title: true });

const mapPayload = z
	.object({
		geometry: z.string().uuid().optional(),
		title: z
			.string()
			.trim()
			.default(() => unwrapFunctionStore(_)('administrative_area.boundary')),
		type: z.literal(payloadTypes.enum.map),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialMapPayload = mapPayload;

const measurePayload = basePayload
	.extend({
		annotation: z.string().trim().optional(),
		comment: z.string().trim().optional(),
		endDate: z.string().date().optional(),
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
		startDate: z.string().date().optional(),
		status: status.default(status.enum['status.idea']),
		template: z.boolean().default(false),
		type: z.literal(payloadTypes.enum.measure)
	})
	.strict();

const initialMeasurePayload = measurePayload.partial({ title: true });

const measureCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('measures')),
		type: z.literal(payloadTypes.enum.measure_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialMeasureCollectionPayload = measureCollectionPayload;

const objectivePayload = basePayload.omit({ category: true, summary: true, topic: true }).extend({
	type: z.literal(payloadTypes.enum.objective),
	wantedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([])
});

const initialObjectivePayload = objectivePayload.partial({ title: true });

const objectiveCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('objectives')),
		type: z.literal(payloadTypes.enum.objective_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialObjectiveCollectionPayload = objectiveCollectionPayload;

const rulePayload = basePayload.extend({
	ruleStatus: ruleStatus.default(ruleStatus.enum['rule_status.idea']),
	type: z.literal(payloadTypes.enum.rule),
	validFrom: z
		.string()
		.refine((v) => z.coerce.date().safeParse(v))
		.optional(),
	validUntil: z
		.string()
		.refine((v) => z.coerce.date().safeParse(v))
		.optional()
});

const initialRulePayload = rulePayload.partial({ title: true });

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
		startDate: z.string().date().optional(),
		status: status.default(status.enum['status.idea']),
		type: z.literal(payloadTypes.enum.simple_measure)
	})
	.strict();

const initialSimpleMeasurePayload = simpleMeasurePayload.partial({ title: true });

const programPayload = basePayload
	.omit({
		description: true,
		summary: true
	})
	.extend({
		chapterType: z.array(payloadTypes).default(chapterTypeOptions),
		image: z.string().url().optional(),
		level: levels.default(levels.enum['level.local']),
		pdf: z.array(z.tuple([z.string().url(), z.string()])).default([]),
		programStatus: programStatus.default(programStatus.enum['program_status.idea']),
		programType: programTypes.default(programTypes.enum['program_type.misc']),
		type: z.literal(payloadTypes.enum.program)
	})
	.strict();

const initialProgramPayload = programPayload.partial({
	title: true
});

const programCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('programs')),
		type: z.literal(payloadTypes.enum.program_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialProgramCollectionPayload = programCollectionPayload;

const measureMonitoringBasePayload = z.object({
	audience: z.array(audience).default([audience.enum['audience.citizens']]),
	description: z.string().trim().optional(),
	summary: z.string().trim().max(200).optional(),
	title: z.string(),
	visibility: visibility.default(visibility.enum['organization'])
});

const effectPayload = measureMonitoringBasePayload
	.omit({ description: true, summary: true })
	.extend({
		achievedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
		plannedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
		type: z.literal(payloadTypes.enum.effect)
	});

const initialEffectPayload = effectPayload.partial({ title: true });

const effectCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('effects')),
		type: z.literal(payloadTypes.enum.effect_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialEffectCollectionPayload = effectCollectionPayload;

const resourcePayload = measureMonitoringBasePayload
	.omit({ description: true, summary: true })
	.extend({
		amount: z.coerce.number().optional(),
		fulfillmentDate: z.string().date().optional(),
		type: z.literal(payloadTypes.enum.resource),
		unit: z.string().optional()
	})
	.strict();

const initialResourcePayload = resourcePayload.partial({
	amount: true,
	fulfillmentDate: true,
	title: true,
	unit: true
});

const resourceCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('resources')),
		type: z.literal(payloadTypes.enum.resource_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialResourceCollectionPayload = resourceCollectionPayload;

const taskPayload = measureMonitoringBasePayload
	.omit({ audience: true, summary: true })
	.extend({
		assignee: z.array(z.string().uuid()).default([]),
		benefit: benefit.optional(),
		effort: z.string().optional(),
		fulfillmentDate: z.string().date().optional(),
		taskCategory: taskCategories.default(taskCategories.enum['task_category.default']),
		taskStatus: taskStatus.default(taskStatus.enum['task_status.idea']),
		type: z.literal(payloadTypes.enum.task)
	})
	.strict();

const initialTaskPayload = taskPayload.partial({ title: true });

const taskCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('tasks')),
		type: z.literal(payloadTypes.enum.task_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialTaskCollectionPayload = taskCollectionPayload;

const organizationPayload = z.object({
	boards: z.array(boards).default([]),
	default: z.boolean().default(false),
	description: z.string().trim().optional(),
	image: z.string().url().optional(),
	name: z.string().trim(),
	organizationCategory: organizationCategories.optional(),
	type: z.literal(payloadTypes.enum.organization),
	visibility: visibility.default(visibility.enum['organization'])
});

const initialOrganizationPayload = organizationPayload.partial({ name: true });

const organizationalUnitPayload = z.object({
	administrativeType: administrativeTypes.optional(),
	boards: z.array(boards).default([]),
	cityAndMunicipalityTypeBBSR: z.string().optional(),
	description: z.string().trim().optional(),
	federalState: z.string().optional(),
	geometry: z.string().uuid().optional(),
	image: z.string().url().optional(),
	level: z.number().int().positive().default(1),
	name: z.string().trim(),
	nameBBSR: z.string().optional(),
	nameOSM: z.string().optional(),
	officialMunicipalityKey: z.string().length(8).optional(),
	officialRegionalCode: z.string().length(12).optional(),
	organizationalUnitType: organizationalUnitType.optional(),
	type: z.literal(payloadTypes.enum.organizational_unit),
	visibility: visibility.default(visibility.enum['organization'])
});

const initialOrganizationalUnitPayload = organizationalUnitPayload.partial({ name: true });

const pagePayload = z.object({
	body: z.string().trim(),
	slug: z.string(),
	title: z.string().trim(),
	type: z.literal(payloadTypes.enum.page),
	visibility: visibility.default(visibility.enum['public'])
});

const initialPagePayload = pagePayload.partial({ body: true, slug: true, title: true });

const textPayload = z
	.object({
		audience: z.array(audience).default([audience.enum['audience.citizens']]),
		body: z.string().trim().optional(),
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.text),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialTextPayload = textPayload.partial({ body: true, title: true });

const undefinedPayload = z
	.object({
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.undefined),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

const initialUndefinedPayload = undefinedPayload.partial({ title: true });

const payload = z.discriminatedUnion('type', [
	actualDataPayload,
	administrativeAreaBasicDataPayload,
	effectCollectionPayload,
	effectPayload,
	fileCollectionPayload,
	goalCollectionPayload,
	goalPayload,
	indicatorCollectionPayload,
	indicatorPayload,
	indicatorTemplatePayload,
	knowledgePayload,
	mapPayload,
	measureCollectionPayload,
	measurePayload,
	objectiveCollectionPayload,
	objectivePayload,
	pagePayload,
	programCollectionPayload,
	programPayload,
	rulePayload,
	resourceCollectionPayload,
	resourcePayload,
	simpleMeasurePayload,
	taskCollectionPayload,
	taskPayload,
	textPayload
]);

export type Payload = z.infer<typeof payload>;

export const container = z.object({
	guid: z.string().uuid(),
	managed_by: z.string().uuid(),
	organization: z.string().uuid(),
	organizational_unit: z.string().uuid().nullable(),
	payload: payload,
	realm: z.string().max(1024),
	relation: z.array(relation).default([]),
	revision: z.number().int().positive(),
	user: z.array(userRelation).default([]),
	valid_currently: z.boolean(),
	valid_from: z.coerce.date()
});

export type Container = z.infer<typeof container>;

const anyPayload = z.discriminatedUnion('type', [
	actualDataPayload,
	administrativeAreaBasicDataPayload,
	effectCollectionPayload,
	effectPayload,
	fileCollectionPayload,
	goalCollectionPayload,
	goalPayload,
	indicatorCollectionPayload,
	indicatorPayload,
	indicatorTemplatePayload,
	knowledgePayload,
	mapPayload,
	measureCollectionPayload,
	measurePayload,
	objectiveCollectionPayload,
	objectivePayload,
	organizationPayload,
	organizationalUnitPayload,
	pagePayload,
	programCollectionPayload,
	programPayload,
	rulePayload,
	resourceCollectionPayload,
	resourcePayload,
	simpleMeasurePayload,
	taskCollectionPayload,
	taskPayload,
	textPayload,
	undefinedPayload
]);

export type AnyPayload = z.infer<typeof anyPayload>;

function hasProperty(payload: AnyPayload, key: PropertyKey): key is keyof AnyPayload {
	return (
		key in (anyPayload.options.map((o) => o.shape).find((s) => s.type.value == payload.type) ?? {})
	);
}

export const anyContainer = container.extend({
	payload: anyPayload
});

export type AnyContainer = z.infer<typeof anyContainer>;

export const containerWithObjective = container.extend({
	payload: z.discriminatedUnion('type', [goalPayload])
});

export type ContainerWithObjective = z.infer<typeof containerWithObjective>;

export function isContainerWithObjective(
	container: AnyContainer | EmptyContainer
): container is ContainerWithObjective {
	return isGoalContainer(container);
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

const actualDataContainer = container.extend({
	payload: actualDataPayload
});

export type ActualDataContainer = z.infer<typeof actualDataContainer>;

export function isActualDataContainer(
	container: AnyContainer | EmptyContainer
): container is ActualDataContainer {
	return container.payload.type === payloadTypes.enum.actual_data;
}

const administrativeAreaBasicDataContainer = container.extend({
	payload: administrativeAreaBasicDataPayload
});

export type AdministrativeAreaBasicDataContainer = z.infer<
	typeof administrativeAreaBasicDataContainer
>;

export function isAdministrativeAreaBasicDataContainer(
	container: AnyContainer | EmptyContainer
): container is AdministrativeAreaBasicDataContainer {
	return container.payload.type === payloadTypes.enum.administrative_area_basic_data;
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

const effectCollectionContainer = container.extend({
	payload: effectCollectionPayload
});

export type EffectCollectionContainer = z.infer<typeof effectCollectionContainer>;

export function isEffectCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is EffectCollectionContainer {
	return container.payload.type === payloadTypes.enum.effect_collection;
}

const fileCollectionContainer = container.extend({
	payload: fileCollectionPayload
});

export type FileCollectionContainer = z.infer<typeof fileCollectionContainer>;

export function isFileCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is FileCollectionContainer {
	return container.payload.type === payloadTypes.enum.file_collection;
}

const goalContainer = container.extend({
	payload: goalPayload
});

export type GoalContainer = z.infer<typeof goalContainer>;

export function isGoalContainer(
	container: AnyContainer | EmptyContainer
): container is GoalContainer {
	return container.payload.type === payloadTypes.enum.goal;
}

const goalCollectionContainer = container.extend({
	payload: goalCollectionPayload
});

export type GoalCollectionContainer = z.infer<typeof goalCollectionContainer>;

export function isGoalCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is GoalCollectionContainer {
	return container.payload.type === payloadTypes.enum.goal_collection;
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

const indicatorCollectionContainer = container.extend({
	payload: indicatorCollectionPayload
});

export type IndicatorCollectionContainer = z.infer<typeof indicatorCollectionContainer>;

export function isIndicatorCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is IndicatorCollectionContainer {
	return container.payload.type === payloadTypes.enum.indicator_collection;
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

const knowledgeContainer = container.extend({
	payload: knowledgePayload
});

export type KnowledgeContainer = z.infer<typeof knowledgeContainer>;

export function isKnowledgeContainer(
	container: AnyContainer | EmptyContainer
): container is KnowledgeContainer {
	return container.payload.type === payloadTypes.enum.knowledge;
}

const mapContainer = container.extend({
	payload: mapPayload
});

export type MapContainer = z.infer<typeof mapContainer>;

export function isMapContainer(
	container: AnyContainer | EmptyContainer
): container is MapContainer {
	return container.payload.type === payloadTypes.enum.map;
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

const measureCollectionContainer = container.extend({
	payload: measureCollectionPayload
});

export type MeasureCollectionContainer = z.infer<typeof measureCollectionContainer>;

export function isMeasureCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is MeasureCollectionContainer {
	return container.payload.type === payloadTypes.enum.measure_collection;
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

const objectiveCollectionContainer = container.extend({
	payload: objectiveCollectionPayload
});

export type ObjectiveCollectionContainer = z.infer<typeof objectiveCollectionContainer>;

export function isObjectiveCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is ObjectiveCollectionContainer {
	return container.payload.type === payloadTypes.enum.objective_collection;
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

const ruleContainer = container.extend({
	payload: rulePayload
});

export type RuleContainer = z.infer<typeof ruleContainer>;

export function isRuleContainer(
	container: AnyContainer | EmptyContainer
): container is RuleContainer {
	return container.payload.type === payloadTypes.enum.rule;
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

const resourceCollectionContainer = container.extend({
	payload: resourceCollectionPayload
});

export type ResourceCollectionContainer = z.infer<typeof resourceCollectionContainer>;

export function isResourceCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceCollectionContainer {
	return container.payload.type === payloadTypes.enum.resource_collection;
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

const programContainer = container.extend({
	payload: programPayload
});

export type ProgramContainer = z.infer<typeof programContainer>;

export function isProgramContainer(
	container: AnyContainer | EmptyContainer
): container is ProgramContainer {
	return container.payload.type === payloadTypes.enum.program;
}

const programCollectionContainer = container.extend({
	payload: programCollectionPayload
});

export type ProgramCollectionContainer = z.infer<typeof programCollectionContainer>;

export function isProgramCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is ProgramCollectionContainer {
	return container.payload.type === payloadTypes.enum.program_collection;
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

const taskContainer = container.extend({
	payload: taskPayload
});

export type TaskContainer = z.infer<typeof taskContainer>;

export function isTaskContainer(
	container: AnyContainer | EmptyContainer
): container is TaskContainer {
	return container.payload.type === payloadTypes.enum.task;
}

const taskCollectionContainer = container.extend({
	payload: taskCollectionPayload
});

export type TaskCollectionContainer = z.infer<typeof taskCollectionContainer>;

export function isTaskCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is TaskCollectionContainer {
	return container.payload.type === payloadTypes.enum.task_collection;
}

export type MeasureMonitoringContainer = EffectContainer | GoalContainer | TaskContainer;

export function isMeasureMonitoringContainer(
	container: AnyContainer | EmptyContainer
): container is MeasureMonitoringContainer {
	return isEffectContainer(container) || isGoalContainer(container) || isTaskContainer(container);
}

export function isContainer(container: AnyContainer | EmptyContainer): container is Container {
	return (
		container.payload.type !== payloadTypes.enum.organization &&
		container.payload.type !== payloadTypes.enum.organizational_unit
	);
}

export type ContainerWithAudience = AnyContainer & {
	payload: AnyPayload & { audience: Audience[] };
};

export function isContainerWithAudience(
	container: AnyContainer | NewContainer
): container is ContainerWithAudience {
	return hasProperty(container.payload, 'audience');
}

export type ContainerWithBody = AnyContainer & {
	payload: AnyPayload & { body: string | undefined };
};

export function isContainerWithBody(
	container: AnyContainer | NewContainer
): container is ContainerWithBody {
	return hasProperty(container.payload, 'body');
}

export type ContainerWithCategory = AnyContainer & {
	payload: AnyPayload & { category: SustainableDevelopmentGoal[] };
};

export function isContainerWithCategory(
	container: AnyContainer | NewContainer
): container is ContainerWithCategory {
	return hasProperty(container.payload, 'category');
}

export type ContainerWithDescription = AnyContainer & {
	payload: AnyPayload & { description: string | undefined };
};

export function isContainerWithDescription(
	container: AnyContainer | NewContainer
): container is ContainerWithDescription {
	return hasProperty(container.payload, 'description');
}

export type ContainerWithDuration = AnyContainer & {
	payload: AnyPayload & { startDate: string; endDate: string };
};

export function isContainerWithDuration(
	container: AnyContainer | NewContainer
): container is ContainerWithDuration {
	return hasProperty(container.payload, 'startDate') && hasProperty(container.payload, 'endDate');
}

export type ContainerWithEditorialState = AnyContainer & {
	payload: AnyPayload & { editorialState: EditorialState | undefined };
};

export function isContainerWithEditorialState(
	container: AnyContainer | NewContainer
): container is ContainerWithEditorialState {
	return hasProperty(container.payload, 'editorialState');
}

export type ContainerWithFulfillmentDate = AnyContainer & {
	payload: AnyPayload & { fulfillmentDate: string | undefined };
};

export function isContainerWithFulfillmentDate(
	container: AnyContainer | NewContainer
): container is ContainerWithFulfillmentDate {
	return hasProperty(container.payload, 'fulfillmentDate');
}

export type ContainerWithName = AnyContainer & {
	payload: AnyPayload & { name: string | undefined };
};

export function isContainerWithName(
	container: AnyContainer | NewContainer
): container is ContainerWithName {
	return hasProperty(container.payload, 'name');
}

export type ContainerWithProgress = AnyContainer & {
	payload: AnyPayload & { progress: number | undefined };
};

export function isContainerWithProgress(
	container: AnyContainer | NewContainer
): container is ContainerWithProgress {
	return hasProperty(container.payload, 'progress');
}

export type ContainerWithStatus = AnyContainer & {
	payload: AnyPayload & { status: Status };
};

export function isContainerWithStatus(
	container: AnyContainer | NewContainer
): container is ContainerWithStatus {
	return hasProperty(container.payload, 'status');
}

export type ContainerWithTitle = AnyContainer & {
	payload: AnyPayload & { title: string | undefined };
};

export function isContainerWithTitle(
	container: AnyContainer | NewContainer
): container is ContainerWithTitle {
	return hasProperty(container.payload, 'title');
}

export type ContainerWithTopic = AnyContainer & {
	payload: AnyPayload & { topic: Topic[] };
};

export function isContainerWithTopic(
	container: AnyContainer | NewContainer
): container is ContainerWithTopic {
	return hasProperty(container.payload, 'topic');
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

export const emptyContainer = newContainer.extend({
	payload: z.discriminatedUnion('type', [
		initialActualDataPayload,
		initialAdministrativeAreaBasicDataPayload,
		initialEffectCollectionPayload,
		initialEffectPayload,
		initialFileCollectionPayload,
		initialGoalCollectionPayload,
		initialGoalPayload,
		initialIndicatorCollectionPayload,
		initialIndicatorPayload,
		initialIndicatorTemplatePayload,
		initialKnowledgePayload,
		initialMapPayload,
		initialMeasureCollectionPayload,
		initialMeasurePayload,
		initialObjectiveCollectionPayload,
		initialObjectivePayload,
		initialOrganizationPayload,
		initialOrganizationalUnitPayload,
		initialPagePayload,
		initialProgramCollectionPayload,
		initialProgramPayload,
		initialRulePayload,
		initialResourceCollectionPayload,
		initialResourcePayload,
		initialSimpleMeasurePayload,
		initialTextPayload,
		initialTaskCollectionPayload,
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

const emptyObjectiveContainer = emptyContainer.extend({
	payload: initialObjectivePayload
});

export type EmptyObjectiveContainer = z.infer<typeof emptyObjectiveContainer>;

const emptyOrganizationalUnitContainer = newContainer.extend({
	payload: initialOrganizationalUnitPayload
});

export type EmptyOrganizationalUnitContainer = z.infer<typeof emptyOrganizationalUnitContainer>;

const emptyRuleContainer = emptyContainer.extend({
	payload: initialRulePayload
});

export type EmptyRuleContainer = z.infer<typeof emptyRuleContainer>;

export const modifiedContainer = anyContainer.omit({
	revision: true,
	valid_currently: true,
	valid_from: true
});

export type ModifiedContainer = z.infer<typeof modifiedContainer>;

export const user = z.object({
	email: z.string().email().optional(),
	family_name: z.string().max(32).default(''),
	given_name: z.string().max(32).default(''),
	guid: z.string().uuid(),
	realm: z.string().max(1024),
	settings: z.object({
		features: z.array(z.string()).optional()
	})
});

export type User = z.infer<typeof user>;

export function displayName(user: User) {
	if (user.given_name != '' && user.family_name != '') {
		return `${user.given_name} ${user.family_name}`;
	} else {
		return user.email ?? user.guid;
	}
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

export function isPartOf(container: { relation: PartialRelation[]; guid: string }) {
	return function (candidate: AnyContainer) {
		return (
			container.relation.findIndex(
				(r) =>
					r.predicate === predicates.enum['is-part-of'] &&
					r.subject === candidate.guid &&
					candidate.guid !== container.guid
			) > -1
		);
	};
}

export function isPartOfMeasure(container: { relation: PartialRelation[]; guid: string }) {
	return function (candidate: AnyContainer) {
		return (
			container.relation.findIndex(
				(r) =>
					r.predicate === predicates.enum['is-part-of-measure'] &&
					r.subject === candidate.guid &&
					candidate.guid !== container.guid
			) > -1
		);
	};
}

export function isRelatedTo(container: { relation: Relation[]; guid: string }) {
	return function (candidate: AnyContainer) {
		return (
			container.relation.findIndex(
				({ object, subject }) =>
					(candidate.guid === object || candidate.guid === subject) &&
					candidate.guid !== container.guid
			) > -1
		);
	};
}

export function isSuggestedByAI(container: Container) {
	return 'aiSuggestion' in container.payload && container.payload.aiSuggestion;
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

export function isHeadOf(user: { guid: string }, container: AnyContainer) {
	return (
		container.user.findIndex(
			({ predicate, subject }) => user.guid == subject && predicate == predicates.enum['is-head-of']
		) > -1
	);
}

export function isMemberOf(user: { guid: string }, container: AnyContainer) {
	return (
		container.user.findIndex(
			({ predicate, subject }) =>
				user.guid == subject && predicate == predicates.enum['is-member-of']
		) > -1
	);
}

export function isObserverOf(user: { guid: string }, container: AnyContainer) {
	return (
		container.user.findIndex(
			({ predicate, subject }) =>
				user.guid == subject && predicate != predicates.enum['is-member-of']
		) > -1 &&
		!isAdminOf(user, container) &&
		!isCollaboratorOf(user, container) &&
		!isHeadOf(user, container)
	);
}

export function isAssignedTo(user: { guid: string }) {
	return (container: TaskContainer) => container.payload.assignee.includes(user.guid);
}

export function containerOfType(
	payloadType: PayloadType,
	organization: string,
	organizationalUnit: string | null,
	managedBy: string,
	realm: string
) {
	return emptyContainer.parse({
		managed_by: payloadType == payloadTypes.enum.organizational_unit ? organization : managedBy,
		organization,
		organizational_unit:
			payloadType == payloadTypes.enum.organizational_unit ? null : organizationalUnit,
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
				'guid' in container &&
				object == container.guid
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

export function findConnected<T extends AnyContainer>(
	container: T,
	containers: T[],
	predicates: Predicate[]
) {
	const found = new Set([container]);

	const recurse = (container: T, containers: T[]) => {
		for (const { object, predicate, subject } of container.relation) {
			if (!predicates.includes(predicate as Predicate)) {
				continue;
			}
			const related = containers
				.filter(({ guid }) => guid != container.guid)
				.find(({ guid }) => guid == object || guid == subject);
			if (related && !found.has(related)) {
				found.add(related);
				recurse(related, containers);
			}
		}
	};

	recurse(container, containers);

	return found;
}

export function findAncestors<T extends AnyContainer>(
	container: T,
	containers: T[],
	predicate: Predicate[]
): T[] {
	const ancestors = new Map<string, T>();

	function traverse(container: T) {
		const parentGuid = container.relation.find(
			(r) => predicate.some((p) => p == r.predicate) && r.subject == container.guid
		)?.object;

		if (!parentGuid) {
			return;
		}

		if (ancestors.has(parentGuid)) {
			return;
		}

		const parent = containers.find(({ guid }) => guid == parentGuid);
		if (parent) {
			ancestors.set(parent.guid, parent);
			traverse(parent);
		}
	}

	traverse(container);
	return Array.from(ancestors.values());
}

export function findDescendants<T extends AnyContainer>(
	container: T,
	containers: T[],
	predicate: Predicate[]
): T[] {
	const descendants = new Map<string, T>();

	function traverse(current: T) {
		const children = containers.filter(
			({ relation, guid }) =>
				relation.findIndex(
					(r) =>
						predicate.some((p) => p == r.predicate) && r.object == current.guid && r.object != guid
				) > -1 && !descendants.has(guid)
		);

		for (const child of children) {
			descendants.set(child.guid, child);
			traverse(child);
		}
	}

	traverse(container);
	return Array.from(descendants.values());
}

export function findParentObjectives(containers: Container[]): ObjectiveContainer[] {
	const roots = new Set<Container>();
	const parentObjectives = [] as ObjectiveContainer[];

	for (const container of containers) {
		const ancestors = findAncestors(container, containers, [predicates.enum['is-part-of']]);

		if (ancestors.length > 0) {
			roots.add(ancestors[ancestors.length - 1]);
		}
	}

	for (const container of roots) {
		const descendants = findDescendants(container, containers, [predicates.enum['is-part-of']]);
		const objectives = descendants.filter(isPartOf(container)).filter(isObjectiveContainer);

		if (objectives.length > 0) {
			parentObjectives.push(...objectives);
		} else {
			parentObjectives.push(...findParentObjectives(descendants));
		}
	}

	return Array.from(parentObjectives);
}

export function findLeafObjectives(containers: ObjectiveContainer[]): ObjectiveContainer[] {
	return containers.filter(
		({ relation, guid }) =>
			relation.findIndex(
				({ predicate, object }) =>
					predicate == predicates.enum['is-sub-target-of'] && object == guid
			) == -1
	);
}

export function findOverallObjective(container: IndicatorContainer, containers: Container[]) {
	return containers
		.filter(isObjectiveContainer)
		.find(
			({ relation }) =>
				relation.some(
					({ object, predicate }) =>
						predicate == predicates.enum['is-objective-for'] && object == container.guid
				) && relation.findIndex(({ predicate }) => predicate == predicates.enum['is-part-of']) == -1
		);
}

export function paramsFromFragment(url: URL) {
	return new URLSearchParams(url.hash.substring(1) ?? '');
}

export function overlayURL(url: URL, key: OverlayKey, guid: string, extraParams?: string[][]) {
	const hashParams = paramsFromFragment(url);

	const newParams = new URLSearchParams([
		...Array.from(hashParams.entries()).filter(([k]) => !isOverlayKey(k)),
		[key, guid],
		...(extraParams ?? [])
	]);

	return `#${newParams.toString()}`;
}

export function getOrganizationURL(container: OrganizationContainer | OrganizationalUnitContainer, linkPath = '/all/page'): URL {
	const url = new URL(env.PUBLIC_BASE_URL ?? '');

	// Only use subdomains if the environment variable is not set
	if (!env.PUBLIC_DONT_USE_SUBDOMAINS) {

		// Maybe add special case for default organization later, 
		// but for now its being redirected to URL without subdomain anyway

		url.hostname = `${container.organization}.${url.hostname}`;
	}

	url.pathname = `/${container.guid}${linkPath}`
		.replace('/me/measures', '/measures/status')
		.replace('/me/tasks', '/tasks/status')
		.replace(/\/me$/, '/all/page');

	return url;
}

export function filterOrganizationalUnits<T extends AnyContainer>(
	containers: Array<T>,
	url: URL,
	subordinateOrganizationalUnits: string[],
	currentOrganizationalUnit?: OrganizationalUnitContainer
): Array<T> {
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

export function filterMembers<T extends AnyContainer>(containers: T[], members: string[]) {
	return members.length == 0
		? containers
		: containers.filter((container) => members.some((guid) => hasMember({ guid })(container)));
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
	container: AnyContainer,
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
			assignee: [],
			taskStatus: taskStatus.enum['task_status.idea']
		};
	} else if (isIndicatorContainer(container)) {
		copy.payload = { ...container.payload, historicalValues: [] };
	} else if (isEffectContainer(container)) {
		copy.payload = {
			...container.payload,
			achievedValues: container.payload.achievedValues.map(([year]) => [year, 0])
		};
	} else {
		copy.payload = { ...container.payload };
	}

	copy.payload = {
		...copy.payload,
		...('fulfillmentDate' in container.payload ? { fulfillmentDate: undefined } : undefined)
	};

	copy.relation.push({
		object: container.guid,
		predicate: predicates.enum['is-copy-of'],
		position: 0
	});

	return copy;
}

export function goalsByHierarchyLevel(containers: GoalContainer[]) {
	const goalsByHierarchyLevel = new Map<number, GoalContainer[]>([[1, []]]);

	for (const container of containers) {
		const hierarchyLevel = container.payload.hierarchyLevel;

		if (goalsByHierarchyLevel.has(hierarchyLevel)) {
			goalsByHierarchyLevel.set(hierarchyLevel, [
				...(goalsByHierarchyLevel.get(hierarchyLevel) as GoalContainer[]),
				container
			]);
		} else {
			goalsByHierarchyLevel.set(hierarchyLevel, [container]);
		}
	}

	return goalsByHierarchyLevel;
}

export function titleForProgramCollection(containers: ProgramContainer[]) {
	const programTypes = new Set(containers.map(({ payload }) => payload.programType));

	if (programTypes.size == 1) {
		const programType = programTypes.values().next().value;
		return unwrapFunctionStore(_)(`${programType}.plural`);
	} else {
		return unwrapFunctionStore(_)('programs');
	}
}

export function computeColumnTitleForGoals(containers: GoalContainer[]) {
	const goalTypes = new Set(containers.map((c) => c.payload.goalType));

	if (goalTypes.size == 1) {
		const goalType = goalTypes.values().next().value;
		return unwrapFunctionStore(_)(goalType ? `${goalType}.plural` : 'goals');
	} else if (goalTypes.size >= 1) {
		return unwrapFunctionStore(_)('goals_by_hierarchy_level', {
			values: { level: containers[0].payload.hierarchyLevel }
		});
	} else {
		return unwrapFunctionStore(_)('goals');
	}
}

export function computeFacetCount(
	facets: Map<string, Map<string, number>>,
	containers: AnyContainer[]
) {
	for (const container of containers) {
		for (const key of facets.keys()) {
			if (key in container.payload) {
				const foci = facets.get(key) as Map<string, number>;
				if (Array.isArray(container.payload[key as keyof typeof container.payload])) {
					for (const value of container.payload[key as keyof typeof container.payload]) {
						foci.set(value, ((foci.get(value) as number) ?? 0) + 1);
					}
				} else {
					const value = container.payload[key as keyof typeof container.payload];
					foci.set(value, ((foci.get(value) as number) ?? 0) + 1);
				}
			}
		}
	}
	return facets;
}
