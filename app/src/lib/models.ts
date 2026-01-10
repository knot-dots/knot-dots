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
	'content-partners',
	'create',
	'goal-iooi',
	'indicator-catalog',
	'new-indicator-catalog',
	'indicators',
	'measure-iooi',
	'measure-monitoring',
	'measures',
	'members',
	'program',
	'relate',
	'relations',
	'resources',
	'tasks',
	'teasers',
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
	'binary_indicator',
	'category',
	'chapter',
	'col_content',
	'content_partner',
	'content_partner_collection',
	'custom_collection',
	'effect',
	'effect_collection',
	'file_collection',
	'goal',
	'goal_collection',
	'help',
	'image',
	'indicator',
	'indicator_collection',
	'indicator_template',
	'info_box',
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
	'progress',
	'report',
	'quote',
	'resource',
	'resource_collection',
	'resource_v2', // New payload type for resources with temporary v2 suffix
	'resource_data',
	'resource_data_collection',
	'rule',
	'simple_measure',
	'summary',
	'task',
	'task_collection',
	'term',
	'teaser',
	'teaser_collection',
	'teaser_highlight',
	'text'
] as const;

export const payloadTypes = z.enum(payloadTypeValues);

export type PayloadType = z.infer<typeof payloadTypes>;

export function isPayloadType(value: unknown): value is PayloadType {
	return payloadTypeValues.includes(value as PayloadType);
}

const categoryObjectTypeValues = [
	payloadTypes.enum.organizational_unit,
	payloadTypes.enum.goal,
	payloadTypes.enum.help,
	payloadTypes.enum.program,
	payloadTypes.enum.measure,
	payloadTypes.enum.simple_measure,
	payloadTypes.enum.rule,
	payloadTypes.enum.knowledge,
	payloadTypes.enum.task,
	payloadTypes.enum.indicator,
	payloadTypes.enum.indicator_template,
	payloadTypes.enum.effect,
	payloadTypes.enum.objective
] as const;

export const categoryObjectTypes = z.enum(categoryObjectTypeValues);

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

const listTypeValues = ['carousel', 'wall', 'list', 'accordion'] as const;

export const listTypes = z.enum(listTypeValues);

const teaserColSizeValues = ['0-100', '33-66', '50-50', '66-33', '100-0'] as const;

export const teaserColSizes = z.enum(teaserColSizeValues);

export type TeaserColSize = z.infer<typeof teaserColSizes>;

export const teaserColSizeToNumber: Record<TeaserColSize, number> = {
	'0-100': 0,
	'33-66': 33,
	'50-50': 50,
	'66-33': 66,
	'100-0': 100
};

export const teaserNumberToColSize: Record<number, TeaserColSize> = {
	0: '0-100',
	33: '33-66',
	50: '50-50',
	66: '66-33',
	100: '100-0'
};

const linkStyleValues = ['default', 'external', 'button'] as const;

export const linkStyles = z.enum(linkStyleValues);

const cardStyleValues = ['default', 'highlight'] as const;

export const cardStyles = z.enum(cardStyleValues);

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
	'implies',
	'is-head-of',
	'is-inconsistent-with',
	'is-measured-by',
	'is-member-of',
	'is-objective-for',
	'is-part-of',
	'is-part-of-category',
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

const backgroundColorValues = [
	'color.white',
	'color.blue',
	'color.gray',
	'color.red',
	'color.orange',
	'color.yellow'
] as const;

export const backgroundColor = z.enum(backgroundColorValues);
export type BackgroundColor = z.infer<typeof backgroundColor>;

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
	'measure_type.activity',
	'measure_type.module',
	'measure_type.partial_measure',
	'measure_type.partial_project',
	'measure_type.project',
	'measure_type.sub_measure',
	'measure_type.sub_project'
] as const;

export const measureTypes = z.enum(measureTypeValues);

export type MeasureType = z.infer<typeof measureTypes>;

const indicatorTypeValues = [
	'indicator_type.impact',
	'indicator_type.key',
	'indicator_type.performance'
] as const;

export const indicatorTypes = z.enum(indicatorTypeValues);

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

const taskCategoryValues = [
	'task_category.default',
	'task_category.program_management',
	'task_category.bugfix',
	'task_category.design',
	'task_category.function',
	'task_category.wording'
] as const;

export const taskCategories = z.enum(taskCategoryValues);

const organizationCategoryValues = [
	'organization_category.business',
	'organization_category.government',
	'organization_category.non_profit',
	'organization_category.political'
] as const;

export const organizationCategories = z.enum(organizationCategoryValues);

const indicatorCategoryValues = [
	'indicator_category.fgk',
	'indicator_category.kpi',
	'indicator_category.mpsc',
	'indicator_category.sdg',
	'indicator_category.wegweiser_kommune',
	'indicator_category.custom'
] as const;

export const indicatorCategories = z.enum(indicatorCategoryValues);

const resourceCategoryValues = [
	'resource_category.money',
	'resource_category.personnel',
	'resource_category.material'
] as const;

export const resourceCategories = z.enum(resourceCategoryValues);

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

export function fromCounts(options: string[], counts: Record<string, number> = {}) {
	const m = new Map<string, number>(options.map((opt) => [opt, 0]));
	for (const [key, count] of Object.entries(counts)) {
		m.set(key, count);
	}
	return m;
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

const resourceUnitValues = ['unit.euro', 'unit.piece', 'unit.personnel_hour'] as const;

export const resourceUnits = z.enum(resourceUnitValues);

export const resourceDataTypes = z.enum([
	'resource_data_type.actual_resource_allocation',
	'resource_data_type.planned_resource_allocation',
	'resource_data_type.budget',
	'resource_data_type.total_budget',
	'resource_data_type.total_budget_forecast'
] as const);

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

export const iooiTypes = z.enum(['iooi.input', 'iooi.output', 'iooi.outcome', 'iooi.impact']);

export type IooiType = z.infer<typeof iooiTypes>;

export function slugify(source: string) {
	return source
		.trim()
		.replace(/[^a-zA-Z0-9_.-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.substring(0, 128);
}

function deduplicate<T>(v: T[]) {
	return [...new Set(v)];
}

const basePayload = z.object({
	aiSuggestion: z.boolean().default(false),
	audience: z.array(audience).transform(deduplicate).default([audience.enum['audience.citizens']]),
	sdg: z.array(sustainableDevelopmentGoals).transform(deduplicate).default([]),
	category: z
		.record(z.string(), z.array(z.string().trim().min(1)).transform(deduplicate))
		.default({}),
	description: z.string().trim().optional(),
	editorialState: editorialState.optional(),
	policyFieldBNK: z.array(policyFieldBNK).transform(deduplicate).default([]),
	summary: z.string().trim().max(200).optional(),
	title: z.string().trim(),
	topic: z.array(topics).transform(deduplicate).default([]),
	visibility: visibility.default(visibility.enum['organization'])
});

const binaryIndicatorPayload = basePayload
	.extend({
		indicatorCategory: z.array(indicatorCategories).transform(deduplicate).default([]),
		indicatorType: z.array(indicatorTypes).transform(deduplicate).default([]),
		type: z.literal(payloadTypes.enum.binary_indicator)
	})
	.strict();

export type BinaryIndicatorPayload = z.infer<typeof binaryIndicatorPayload>;

const initialBinaryIndicatorPayload = binaryIndicatorPayload.partial({ title: true });

const unrefinedCategoryPayload = z
	.object({
		description: z.string().trim().optional(),
		key: z.string().trim().optional(),
		objectTypes: z
			.array(categoryObjectTypes)
			.transform(deduplicate)
			.default(categoryObjectTypes.options),
		title: z.string().trim().min(1),
		type: z.literal(payloadTypes.enum.category),
		visibility: visibility.default(visibility.enum['public'])
	})
	.strict();

const categoryPayload = unrefinedCategoryPayload.superRefine((payload) => {
	if (payload.title && !payload.key) {
		payload.key = slugify(payload.title);
	}
});

export type CategoryPayload = z.infer<typeof categoryPayload>;

const initialCategoryPayload = unrefinedCategoryPayload.partial({ title: true, key: true });

export type InitialCategoryPayload = z.infer<typeof initialCategoryPayload>;

const unrefinedTermPayload = z
	.object({
		description: z.string().trim().optional(),
		filterLabel: z.string().trim().max(256).optional(),
		title: z.string().trim().min(1),
		value: z.string().trim().optional(),
		icon: z.string().trim().optional(),
		type: z.literal(payloadTypes.enum.term),
		visibility: visibility.default(visibility.enum['public'])
	})
	.strict();

const termPayload = unrefinedTermPayload.superRefine((payload) => {
	if (payload.title && !payload.value) {
		payload.value = slugify(payload.title);
	}
});

export type TermPayload = z.infer<typeof termPayload>;

const initialTermPayload = unrefinedTermPayload.partial({ title: true, value: true });

export type InitialTermPayload = z.infer<typeof initialTermPayload>;

const actualDataPayload = z
	.object({
		audience: z
			.array(audience)
			.transform(deduplicate)
			.default([audience.enum['audience.citizens']]),
		booleanValue: z.boolean().default(false),
		indicator: z.string().uuid(),
		source: z.string().optional(),
		title: z.string(),
		type: z.literal(payloadTypes.enum.actual_data),
		values: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type ActualDataPayload = z.infer<typeof actualDataPayload>;

const initialActualDataPayload = actualDataPayload.partial({ indicator: true, title: true });

const administrativeAreaBasicDataPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('administrative_area.basic_data')),
		type: z.literal(payloadTypes.enum.administrative_area_basic_data),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type AdministrativeAreaBasicDataPayload = z.infer<typeof administrativeAreaBasicDataPayload>;

const initialAdministrativeAreaBasicDataPayload = administrativeAreaBasicDataPayload;

const chapterPayload = basePayload
	.extend({
		image: z.url().optional(),
		number: z.string(),
		type: z.literal(payloadTypes.enum.chapter)
	})
	.omit({
		description: true,
		summary: true
	})
	.strict();

export type ChapterPayload = z.infer<typeof chapterPayload>;

const initialChapterPayload = chapterPayload.partial({ number: true, title: true });

const customCollectionPayload = z
	.object({
		filter: z
			.object({
				audience: z.array(audience).default([]),
				category: z.array(sustainableDevelopmentGoals).default([]),
				sdg: z.array(sustainableDevelopmentGoals).default([]),
				indicatorCategory: z.array(indicatorCategories).default([]),
				type: z.array(payloadTypes).default([]),
				policyFieldBNK: z.array(policyFieldBNK).default([]),
				topic: z.array(topics).default([])
			})
			.default({
				audience: [],
				category: [],
				sdg: [],
				indicatorCategory: [],
				policyFieldBNK: [],
				topic: [],
				type: []
			}),
		item: z.array(z.uuid()).default([]),
		sort: z.enum(['alpha', 'modified']).default('alpha'),
		terms: z.string().default(''),
		title: z.string(),
		type: z.literal(payloadTypes.enum.custom_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type CustomCollectionPayload = z.infer<typeof customCollectionPayload>;

const initialCustomCollectionPayload = customCollectionPayload.partial({ title: true });

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

export type FileCollectionPayload = z.infer<typeof fileCollectionPayload>;

const initialFileCollectionPayload = fileCollectionPayload;

const goalPayload = basePayload
	.extend({
		fulfillmentDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		goalStatus: goalStatus.default(goalStatus.enum['goal_status.idea']),
		goalType: goalType.optional(),
		hierarchyLevel: z.number().int().gte(1).lte(6).default(1),
		progress: z.number().nonnegative().optional(),
		type: z.literal(payloadTypes.enum.goal)
	})
	.strict();

export type GoalPayload = z.infer<typeof goalPayload>;

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

export type GoalCollectionPayload = z.infer<typeof goalCollectionPayload>;

const initialGoalCollectionPayload = goalCollectionPayload;

const helpPayload = z
	.object({
		body: z.string().trim().default(''),
		slug: z.string().default(''),
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.help),
		visibility: visibility.default(visibility.enum['public'])
	})
	.strict();

export type HelpPayload = z.infer<typeof helpPayload>;

const initialHelpPayload = helpPayload.partial({ body: true, slug: true, title: true });

const indicatorPayload = basePayload
	.extend({
		externalReference: z.string().url().optional(),
		historicalValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
		indicatorCategory: z.array(indicatorCategories).transform(deduplicate).default([]),
		indicatorType: z.array(indicatorTypes).transform(deduplicate).default([]),
		quantity: z.string(),
		type: z.literal(payloadTypes.enum.indicator),
		unit: z.string()
	})
	.strict();

export type IndicatorPayload = z.infer<typeof indicatorPayload>;

const initialIndicatorPayload = indicatorPayload.partial({
	quantity: true,
	title: true,
	unit: true
});

export type InitialIndicatorPayload = z.infer<typeof initialIndicatorPayload>;

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

export type IndicatorCollectionPayload = z.infer<typeof indicatorCollectionPayload>;

const initialIndicatorCollectionPayload = indicatorCollectionPayload;

const indicatorTemplatePayload = indicatorPayload
	.extend({
		type: z.literal(payloadTypes.enum.indicator_template)
	})
	.omit({ historicalValues: true, quantity: true })
	.strict();

export type IndicatorTemplatePayload = z.infer<typeof indicatorTemplatePayload>;

const initialIndicatorTemplatePayload = indicatorTemplatePayload.partial({
	title: true,
	unit: true
});

const knowledgePayload = basePayload
	.extend({ type: z.literal(payloadTypes.enum.knowledge) })
	.strict();

export type KnowledgePayload = z.infer<typeof knowledgePayload>;

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

export type MapPayload = z.infer<typeof mapPayload>;

const initialMapPayload = mapPayload;

const measurePayload = basePayload
	.extend({
		annotation: z.string().trim().optional(),
		comment: z.string().trim().optional(),
		endDate: z.string().date().optional(),
		hierarchyLevel: z.number().int().gte(1).lte(6).default(1),
		measureType: measureTypes.optional(),
		progress: z.number().nonnegative().optional(),
		result: z.string().trim().optional(),
		startDate: z.string().date().optional(),
		status: status.default(status.enum['status.idea']),
		template: z.boolean().default(false),
		type: z.literal(payloadTypes.enum.measure)
	})
	.strict();

export type MeasurePayload = z.infer<typeof measurePayload>;

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

export type MeasureCollectionPayload = z.infer<typeof measureCollectionPayload>;

const initialMeasureCollectionPayload = measureCollectionPayload;

const objectivePayload = basePayload
	.omit({ category: true, summary: true, topic: true })
	.extend({
		iooiType: iooiTypes.default(iooiTypes.enum['iooi.output']),
		trendValue: z
			.enum({ 'objective.trend_value_up': 1, 'objective.trend_value_down': -1 })
			.optional(),
		type: z.literal(payloadTypes.enum.objective),
		booleanValue: z.boolean().optional(),
		wantedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([])
	})
	.strict();

export type ObjectivePayload = z.infer<typeof objectivePayload>;

const initialObjectivePayload = objectivePayload.partial({ title: true });

export type InitialObjectivePayload = z.infer<typeof initialObjectivePayload>;

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

export type ObjectiveCollectionPayload = z.infer<typeof objectiveCollectionPayload>;

const initialObjectiveCollectionPayload = objectiveCollectionPayload;

const progressPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('progress')),
		type: z.literal(payloadTypes.enum.progress),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type ProgressPayload = z.infer<typeof progressPayload>;

const initialProgressPayload = progressPayload;

const rulePayload = basePayload
	.extend({
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
	})
	.strict();

export type RulePayload = z.infer<typeof rulePayload>;

const initialRulePayload = rulePayload.partial({ title: true });

export type InitialRulePayload = z.infer<typeof initialRulePayload>;

const simpleMeasurePayload = basePayload
	.omit({ summary: true })
	.extend({
		annotation: z.string().trim().optional(),
		endDate: z
			.string()
			.refine((v) => z.coerce.date().safeParse(v))
			.optional(),
		file: z.array(z.tuple([z.string().url(), z.string()])).default([]),
		measureType: measureTypes.optional(),
		progress: z.number().nonnegative().default(0),
		startDate: z.string().date().optional(),
		status: status.default(status.enum['status.idea']),
		type: z.literal(payloadTypes.enum.simple_measure)
	})
	.strict();

export type SimpleMeasurePayload = z.infer<typeof simpleMeasurePayload>;

const initialSimpleMeasurePayload = simpleMeasurePayload.partial({ title: true });

const summaryPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('summary')),
		type: z.literal(payloadTypes.enum.summary),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type SummaryPayload = z.infer<typeof summaryPayload>;

const initialSummaryPayload = summaryPayload;

const programPayload = basePayload
	.omit({
		description: true,
		summary: true
	})
	.extend({
		chapterType: z.array(payloadTypes).transform(deduplicate).default(chapterTypeOptions),
		image: z.string().url().optional(),
		level: levels.default(levels.enum['level.local']),
		pdf: z.array(z.tuple([z.string().url(), z.string()])).default([]),
		programStatus: programStatus.default(programStatus.enum['program_status.idea']),
		programType: programTypes.default(programTypes.enum['program_type.misc']),
		type: z.literal(payloadTypes.enum.program)
	})
	.strict();

export type ProgramPayload = z.infer<typeof programPayload>;

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

export type ProgramCollectionPayload = z.infer<typeof programCollectionPayload>;

const initialProgramCollectionPayload = programCollectionPayload;

const measureMonitoringBasePayload = z.object({
	audience: z.array(audience).transform(deduplicate).default([audience.enum['audience.citizens']]),
	description: z.string().trim().optional(),
	summary: z.string().trim().max(200).optional(),
	title: z.string(),
	visibility: visibility.default(visibility.enum['organization'])
});

const effectPayload = measureMonitoringBasePayload
	.omit({ summary: true })
	.extend({
		achievedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
		booleanValue: z.boolean().optional(),
		iooiType: iooiTypes.default(iooiTypes.enum['iooi.output']),
		plannedValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
		trendValue: z.enum({ 'effect.trend_value_up': 1, 'effect.trend_value_down': -1 }).optional(),
		type: z.literal(payloadTypes.enum.effect)
	})
	.strict();

export type EffectPayload = z.infer<typeof effectPayload>;

const initialEffectPayload = effectPayload.partial({ title: true });

export type InitialEffectPayload = z.infer<typeof initialEffectPayload>;

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

export type EffectCollectionPayload = z.infer<typeof effectCollectionPayload>;

const initialEffectCollectionPayload = effectCollectionPayload;

const reportPayload = basePayload
	.extend({
		type: z.literal(payloadTypes.enum.report)
	})
	.strict();

export type ReportPayload = z.infer<typeof reportPayload>;

const initialReportPayload = reportPayload.partial({ title: true });

const resourcePayload = measureMonitoringBasePayload
	.omit({ description: true, summary: true })
	.extend({
		amount: z.coerce.number().optional(),
		fulfillmentDate: z.string().date().optional(),
		type: z.literal(payloadTypes.enum.resource),
		unit: z.string().optional()
	})
	.strict();

export type ResourcePayload = z.infer<typeof resourcePayload>;

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

export type ResourceCollectionPayload = z.infer<typeof resourceCollectionPayload>;

const initialResourceCollectionPayload = resourceCollectionPayload;

const resourceV2Payload = basePayload
	.omit({ audience: true, category: true, summary: true, topic: true })
	.extend({
		type: z.literal(payloadTypes.enum.resource_v2),
		resourceCategory: resourceCategories.default(
			resourceCategories.enum['resource_category.money']
		),
		resourceUnit: resourceUnits.default(resourceUnits.enum['unit.euro']),
		visibility: visibility.default(visibility.enum['public'])
	})
	.strict();

export type ResourceV2Payload = z.infer<typeof resourceV2Payload>;

const initialResourceV2Payload = resourceV2Payload.partial({ title: true });

const resourceDataPayload = z
	.object({
		description: z.string().trim().optional(),
		entries: z
			.array(
				z.object({
					year: z.number().int().positive(),
					amount: z.coerce.number()
				})
			)
			.default([]),
		resource: z.uuid(),
		resourceDataType: resourceDataTypes,
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.resource_data),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type ResourceDataPayload = z.infer<typeof resourceDataPayload>;

const initialResourceDataPayload = resourceDataPayload.partial({
	resource: true,
	resourceDataType: true,
	title: true
});

export type InitialResourceDataPayload = z.infer<typeof initialResourceDataPayload>;

const resourceDataCollectionPayload = z
	.object({
		resourceDataType: resourceDataTypes,
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('resource_data')),
		type: z.literal(payloadTypes.enum.resource_data_collection),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type ResourceDataCollectionPayload = z.infer<typeof resourceDataCollectionPayload>;

const initialResourceDataCollectionPayload = resourceDataCollectionPayload.partial({
	resourceDataType: true
});

const taskPayload = measureMonitoringBasePayload
	.omit({ audience: true, summary: true })
	.extend({
		assignee: z.array(z.string().uuid()).transform(deduplicate).default([]),
		benefit: benefit.optional(),
		effort: z.string().optional(),
		fulfillmentDate: z.string().date().optional(),
		taskCategory: taskCategories.default(taskCategories.enum['task_category.default']),
		taskStatus: taskStatus.default(taskStatus.enum['task_status.idea']),
		type: z.literal(payloadTypes.enum.task)
	})
	.strict();

export type TaskPayload = z.infer<typeof taskPayload>;

const initialTaskPayload = taskPayload.partial({ title: true });

const imagePayload = z
	.object({
		body: z.string().trim().optional(),
		image: z.string().url().optional(),
		imageAltText: z.string().optional(),
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.image),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type ImagePayload = z.infer<typeof imagePayload>;

const initialImagePayload = imagePayload.partial({ body: true, title: true });

const teaserPayload = z
	.object({
		audience: z
			.array(audience)
			.transform(deduplicate)
			.default([audience.enum['audience.citizens']]),
		body: z.string().trim().optional(),
		bodyRight: z.string().trim().optional(),
		cardStyle: z.string().optional(),
		colSize: teaserColSizes.default('33-66'),
		description: z.string().optional(),
		image: z.string().url().optional(),
		imageAltText: z.string().optional(),
		imageAltTextRight: z.string().optional(),
		imageEnable: z.boolean().default(true),
		imageEnableRight: z.boolean().default(false),
		imageRight: z.string().url().optional(),
		link: z.string().optional(),
		linkEnable: z.boolean().default(false),
		linkEnableRight: z.boolean().default(false),
		linkRight: z.string().optional(),
		linkCaption: z.string().optional(),
		linkCaptionRight: z.string().optional(),
		textEnable: z.boolean().default(false),
		textEnableRight: z.boolean().default(true),
		title: z.string().trim(),
		titleEnable: z.boolean().default(false),
		titleEnableRight: z.boolean().default(true),
		titleRight: z.string().trim().optional(),
		type: z.literal(payloadTypes.enum.teaser),
		style: z.string().optional().default('default'),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type TeaserPayload = z.infer<typeof teaserPayload>;

const initialTeaserPayload = teaserPayload.partial({ title: true });

const infoBoxPayload = teaserPayload
	.extend({
		colSize: teaserColSizes.default('100-0'),
		imageEnable: z.boolean().default(false),
		imageEnableRight: z.boolean().default(false),
		linkEnable: z.boolean().default(false),
		linkEnableRight: z.boolean().default(false),
		textEnable: z.boolean().default(true),
		textEnableRight: z.boolean().default(false),
		titleEnable: z.boolean().default(true),
		titleEnableRight: z.boolean().default(false),
		type: z.literal(payloadTypes.enum.info_box)
	})
	.strict();

export type InfoBoxPayload = z.infer<typeof infoBoxPayload>;

const initialInfoBoxPayload = infoBoxPayload.partial({ title: true });

const teaserHighlightPayload = teaserPayload
	.extend({
		colSize: teaserColSizes.default('100-0'),
		imageEnable: z.boolean().default(false),
		imageEnableRight: z.boolean().default(false),
		linkEnable: z.boolean().default(false),
		linkEnableRight: z.boolean().default(false),
		textEnable: z.boolean().default(true),
		textEnableRight: z.boolean().default(false),
		titleEnable: z.boolean().default(true),
		titleEnableRight: z.boolean().default(false),
		type: z.literal(payloadTypes.enum.teaser_highlight)
	})
	.strict();

export type TeaserHighlightPayload = z.infer<typeof teaserHighlightPayload>;

const initialTeaserHighlightPayload = teaserHighlightPayload.partial({ title: true });

const quotePayload = teaserPayload
	.extend({
		colSize: teaserColSizes.default('100-0'),
		imageEnable: z.boolean().default(false),
		imageEnableRight: z.boolean().default(false),
		linkEnable: z.boolean().default(false),
		linkEnableRight: z.boolean().default(false),
		textEnable: z.boolean().default(true),
		textEnableRight: z.boolean().default(false),
		titleEnable: z.boolean().default(true),
		titleEnableRight: z.boolean().default(false),
		type: z.literal(payloadTypes.enum.quote)
	})
	.strict();

export type QuotePayload = z.infer<typeof quotePayload>;

const initialQuotePayload = quotePayload.partial({ title: true });

const colContentPayload = teaserPayload
	.extend({
		colSize: teaserColSizes.default('50-50'),
		imageEnable: z.boolean().default(true),
		imageEnableRight: z.boolean().default(true),
		linkEnable: z.boolean().default(false),
		linkEnableRight: z.boolean().default(false),
		textEnable: z.boolean().default(true),
		textEnableRight: z.boolean().default(true),
		titleEnable: z.boolean().default(true),
		titleEnableRight: z.boolean().default(true),
		type: z.literal(payloadTypes.enum.col_content)
	})
	.strict();

export type ColContentPayload = z.infer<typeof colContentPayload>;

const initialColContentPayload = colContentPayload.partial({ title: true });

const contentPartnerPayload = basePayload
	.extend({
		image: z.string().url().optional(),
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.content_partner),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type ContentPartnerPayload = z.infer<typeof contentPartnerPayload>;

const initialContentPartnerPayload = contentPartnerPayload.partial({ title: true });

const contentPartnerCollectionPayload = z
	.object({
		title: z.string().readonly().default('Partners'),
		type: z.literal(payloadTypes.enum.content_partner_collection),
		listType: listTypes.default(listTypes.enum.list),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type ContentPartnerCollectionPayload = z.infer<typeof contentPartnerCollectionPayload>;

const initialContentPartnerCollectionPayload = contentPartnerCollectionPayload;

const teaserCollectionPayload = z
	.object({
		title: z
			.string()
			.readonly()
			.default(() => unwrapFunctionStore(_)('teasers')),
		type: z.literal(payloadTypes.enum.teaser_collection),
		listType: listTypes.default(listTypes.enum.accordion),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type TeaserCollectionPayload = z.infer<typeof teaserCollectionPayload>;

const initialTeaserCollectionPayload = teaserCollectionPayload;

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

export type TaskCollectionPayload = z.infer<typeof taskCollectionPayload>;

const initialTaskCollectionPayload = taskCollectionPayload;

const organizationPayload = z
	.object({
		boards: z.array(boards).transform(deduplicate).default([]),
		color: backgroundColor.optional(),
		cover: z.string().url().optional(),
		default: z.boolean().default(false),
		description: z.string().trim().optional(),
		favorite: z
			.array(
				z.object({
					href: z.string(),
					icon: z.url().optional(),
					title: z.string().trim()
				})
			)
			.default([]),
		image: z.string().url().optional(),
		name: z.string().trim(),
		organizationCategory: organizationCategories.optional(),
		type: z.literal(payloadTypes.enum.organization),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type OrganizationPayload = z.infer<typeof organizationPayload>;

const initialOrganizationPayload = organizationPayload.partial({ name: true });

const organizationalUnitPayload = z
	.object({
		administrativeType: administrativeTypes.optional(),
		boards: z.array(boards).transform(deduplicate).default([]),
		color: backgroundColor.optional(),
		cover: z.string().url().optional(),
		cityAndMunicipalityTypeBBSR: z.string().optional(),
		description: z.string().trim().optional(),
		favorite: z
			.array(
				z.object({
					href: z.string(),
					icon: z.url().optional(),
					title: z.string().trim()
				})
			)
			.default([]),
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
	})
	.strict();

export type OrganizationalUnitPayload = z.infer<typeof organizationalUnitPayload>;

const initialOrganizationalUnitPayload = organizationalUnitPayload.partial({ name: true });

export type InitialOrganizationalUnitPayload = z.infer<typeof initialOrganizationalUnitPayload>;

const pagePayload = z
	.object({
		body: z.string().trim(),
		color: backgroundColor.optional(),
		cover: z.url().optional(),
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.page),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type PagePayload = z.infer<typeof pagePayload>;

const initialPagePayload = pagePayload.partial({ body: true, title: true });

const textPayload = z
	.object({
		audience: z
			.array(audience)
			.transform(deduplicate)
			.default([audience.enum['audience.citizens']]),
		body: z.string().trim().optional(),
		title: z.string().trim(),
		type: z.literal(payloadTypes.enum.text),
		visibility: visibility.default(visibility.enum['organization'])
	})
	.strict();

export type TextPayload = z.infer<typeof textPayload>;

const initialTextPayload = textPayload.partial({ body: true, title: true });

const payload = z.discriminatedUnion('type', [
	actualDataPayload,
	administrativeAreaBasicDataPayload,
	binaryIndicatorPayload,
	chapterPayload,
	categoryPayload,
	colContentPayload,
	contentPartnerCollectionPayload,
	contentPartnerPayload,
	customCollectionPayload,
	effectCollectionPayload,
	effectPayload,
	fileCollectionPayload,
	goalCollectionPayload,
	goalPayload,
	helpPayload,
	imagePayload,
	indicatorCollectionPayload,
	indicatorPayload,
	indicatorTemplatePayload,
	infoBoxPayload,
	knowledgePayload,
	mapPayload,
	measureCollectionPayload,
	measurePayload,
	objectiveCollectionPayload,
	objectivePayload,
	pagePayload,
	programCollectionPayload,
	programPayload,
	progressPayload,
	quotePayload,
	reportPayload,
	rulePayload,
	resourceCollectionPayload,
	resourcePayload,
	resourceV2Payload,
	resourceDataPayload,
	resourceDataCollectionPayload,
	simpleMeasurePayload,
	summaryPayload,
	taskCollectionPayload,
	taskPayload,
	termPayload,
	teaserPayload,
	teaserCollectionPayload,
	teaserHighlightPayload,
	textPayload
]);

export type Payload = z.infer<typeof payload>;

export const anyPayload = z.discriminatedUnion('type', [
	...payload.options,
	organizationPayload,
	organizationalUnitPayload
]);

export type AnyPayload = z.infer<typeof anyPayload>;

const initialPayload = z.discriminatedUnion('type', [
	initialActualDataPayload,
	initialAdministrativeAreaBasicDataPayload,
	initialBinaryIndicatorPayload,
	initialCategoryPayload,
	initialChapterPayload,
	initialColContentPayload,
	initialContentPartnerCollectionPayload,
	initialContentPartnerPayload,
	initialCustomCollectionPayload,
	initialEffectCollectionPayload,
	initialEffectPayload,
	initialFileCollectionPayload,
	initialGoalCollectionPayload,
	initialGoalPayload,
	initialHelpPayload,
	initialImagePayload,
	initialIndicatorCollectionPayload,
	initialIndicatorPayload,
	initialIndicatorTemplatePayload,
	initialInfoBoxPayload,
	initialKnowledgePayload,
	initialMapPayload,
	initialMeasureCollectionPayload,
	initialMeasurePayload,
	initialObjectiveCollectionPayload,
	initialObjectivePayload,
	initialPagePayload,
	initialProgramCollectionPayload,
	initialProgramPayload,
	initialProgressPayload,
	initialQuotePayload,
	initialRulePayload,
	initialReportPayload,
	initialResourceCollectionPayload,
	initialResourceDataPayload,
	initialResourceDataCollectionPayload,
	initialResourcePayload,
	initialResourceV2Payload,
	initialSimpleMeasurePayload,
	initialSummaryPayload,
	initialTaskCollectionPayload,
	initialTaskPayload,
	initialTeaserCollectionPayload,
	initialTeaserHighlightPayload,
	initialTeaserPayload,
	initialTermPayload,
	initialTextPayload
]);

export const anyInitialPayload = z.discriminatedUnion('type', [
	...initialPayload.options,
	initialOrganizationPayload,
	initialOrganizationalUnitPayload
]);

export type AnyInitialPayload = z.infer<typeof anyInitialPayload>;

function createContainerSchema<P extends z.ZodTypeAny>(payloadSchema: P) {
	return z.object({
		guid: z.string().uuid(),
		managed_by: z.string().uuid(),
		organization: z.string().uuid(),
		organizational_unit: z.string().uuid().nullable(),
		payload: payloadSchema,
		realm: z.string().max(1024),
		relation: z.array(relation).default([]),
		revision: z.number().int().positive(),
		user: z.array(userRelation).default([]),
		valid_currently: z.boolean(),
		valid_from: z.coerce.date()
	});
}

export const container = createContainerSchema(payload);

export const anyContainer = createContainerSchema(anyPayload);

export const actualDataContainer = createContainerSchema(actualDataPayload);

export const helpContainer = createContainerSchema(helpPayload);

export const indicatorTemplateContainer = createContainerSchema(indicatorTemplatePayload);

export const organizationContainer = createContainerSchema(organizationPayload);

export const organizationalUnitContainer = createContainerSchema(organizationalUnitPayload);

export type Container<P = Payload> = z.infer<
	ReturnType<typeof createContainerSchema<z.ZodType<P>>>
>;

export type AnyContainer = Container<AnyPayload>;

export function createNewContainerSchema<P extends z.ZodTypeAny>(payloadSchema: P) {
	return z.object({
		managed_by: z.string().uuid(),
		organization: z.string().uuid(),
		organizational_unit: z.string().uuid().nullable(),
		payload: payloadSchema,
		realm: z.string().max(1024),
		relation: z.array(partialRelation).default([]),
		user: z.array(userRelation).default([])
	});
}

export const newContainer = createNewContainerSchema(anyInitialPayload);

export type NewContainer<P extends AnyInitialPayload = AnyInitialPayload> = z.infer<
	ReturnType<typeof createNewContainerSchema<z.ZodType<P>>>
>;

export type EmptyContainer = NewContainer;

export type EmptyEffectContainer = NewContainer<InitialEffectPayload>;

export type EmptyIndicatorContainer = NewContainer<InitialIndicatorPayload>;

export type EmptyObjectiveContainer = NewContainer<InitialObjectivePayload>;

export type EmptyOrganizationalUnitContainer = NewContainer<InitialOrganizationalUnitPayload>;

export type EmptyRuleContainer = NewContainer<InitialRulePayload>;

function createModifiedContainerSchema<P extends z.ZodTypeAny>(payloadSchema: P) {
	return z.object({
		guid: z.string().uuid(),
		managed_by: z.string().uuid(),
		organization: z.string().uuid(),
		organizational_unit: z.string().uuid().nullable(),
		payload: payloadSchema,
		realm: z.string().max(1024),
		relation: z.array(partialRelation).default([]),
		user: z.array(userRelation).default([]),
		valid_currently: z.boolean(),
		valid_from: z.coerce.date()
	});
}

export const modifiedContainer = createModifiedContainerSchema(anyPayload);

export type ModifiedContainer<P extends AnyPayload = AnyPayload> = z.infer<
	ReturnType<typeof createModifiedContainerSchema<z.ZodType<P>>>
>;

export function isContainerWithPayloadType<T extends PayloadType>(
	payloadType: T,
	container: Container<AnyPayload> | NewContainer
): container is Container<Extract<AnyPayload, { type: T }>> {
	return container.payload.type == payloadType;
}

export type ContainerWithObjective = GoalContainer;

export function isContainerWithObjective(
	container: AnyContainer | EmptyContainer
): container is ContainerWithObjective {
	return isGoalContainer(container);
}

export type ContainerWithEffect = Container<MeasurePayload | SimpleMeasurePayload>;

export function isContainerWithEffect(
	container: AnyContainer | EmptyContainer
): container is ContainerWithEffect {
	return isMeasureContainer(container) || isSimpleMeasureContainer(container);
}

export type ActualDataContainer = Container<ActualDataPayload>;

export function isActualDataContainer(
	container: AnyContainer | EmptyContainer
): container is ActualDataContainer {
	return isContainerWithPayloadType(payloadTypes.enum.actual_data, container);
}

export type AdministrativeAreaBasicDataContainer = Container<AdministrativeAreaBasicDataPayload>;

export function isAdministrativeAreaBasicDataContainer(
	container: AnyContainer | EmptyContainer
): container is AdministrativeAreaBasicDataContainer {
	return isContainerWithPayloadType(payloadTypes.enum.administrative_area_basic_data, container);
}

export type BinaryIndicatorContainer = Container<BinaryIndicatorPayload>;

export function isBinaryIndicatorContainer(
	container: AnyContainer | EmptyContainer
): container is BinaryIndicatorContainer {
	return container.payload.type === payloadTypes.enum.binary_indicator;
}

export type ChapterContainer = Container<ChapterPayload>;

export function isChapterContainer(
	container: AnyContainer | EmptyContainer
): container is ChapterContainer {
	return isContainerWithPayloadType(payloadTypes.enum.chapter, container);
}

export type CategoryContainer = Container<CategoryPayload>;

export function isCategoryContainer(
	container: AnyContainer | EmptyContainer
): container is CategoryContainer {
	return container.payload.type === payloadTypes.enum.category;
}

export type CustomCollectionContainer = Container<CustomCollectionPayload>;

export function isCustomCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is CustomCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.custom_collection, container);
}

export type EffectContainer = Container<EffectPayload>;

export function isEffectContainer(
	container: AnyContainer | EmptyContainer
): container is EffectContainer {
	return isContainerWithPayloadType(payloadTypes.enum.effect, container);
}

export type EffectCollectionContainer = Container<EffectCollectionPayload>;

export function isEffectCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is EffectCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.effect_collection, container);
}

export type FileCollectionContainer = Container<FileCollectionPayload>;

export function isFileCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is FileCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.file_collection, container);
}

export type GoalContainer = Container<GoalPayload>;

export function isGoalContainer(
	container: AnyContainer | EmptyContainer
): container is GoalContainer {
	return isContainerWithPayloadType(payloadTypes.enum.goal, container);
}

export type GoalCollectionContainer = Container<GoalCollectionPayload>;

export function isGoalCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is GoalCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.goal_collection, container);
}

export type HelpContainer = Container<HelpPayload>;

export function isHelpContainer(
	container: AnyContainer | EmptyContainer
): container is HelpContainer {
	return container.payload.type === payloadTypes.enum.help;
}

export type IndicatorContainer = Container<IndicatorPayload>;

export function isIndicatorContainer(
	container: AnyContainer | EmptyContainer
): container is IndicatorContainer {
	return isContainerWithPayloadType(payloadTypes.enum.indicator, container);
}

export type IndicatorCollectionContainer = Container<IndicatorCollectionPayload>;

export function isIndicatorCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is IndicatorCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.indicator_collection, container);
}

export type IndicatorTemplateContainer = Container<IndicatorTemplatePayload>;

export function isIndicatorTemplateContainer(
	container: AnyContainer | EmptyContainer
): container is IndicatorTemplateContainer {
	return isContainerWithPayloadType(payloadTypes.enum.indicator_template, container);
}

export type KnowledgeContainer = Container<KnowledgePayload>;

export function isKnowledgeContainer(
	container: AnyContainer | EmptyContainer
): container is KnowledgeContainer {
	return isContainerWithPayloadType(payloadTypes.enum.knowledge, container);
}

export type MapContainer = Container<MapPayload>;

export function isMapContainer(
	container: AnyContainer | EmptyContainer
): container is MapContainer {
	return isContainerWithPayloadType(payloadTypes.enum.map, container);
}

export type MeasureContainer = Container<MeasurePayload>;

export function isMeasureContainer(
	container: AnyContainer | EmptyContainer
): container is MeasureContainer {
	return isContainerWithPayloadType(payloadTypes.enum.measure, container);
}

export type MeasureCollectionContainer = Container<MeasureCollectionPayload>;

export function isMeasureCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is MeasureCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.measure_collection, container);
}

export type ObjectiveContainer = Container<ObjectivePayload>;

export function isObjectiveContainer(
	container: AnyContainer | EmptyContainer
): container is ObjectiveContainer {
	return isContainerWithPayloadType(payloadTypes.enum.objective, container);
}

export type ObjectiveCollectionContainer = Container<ObjectiveCollectionPayload>;

export function isObjectiveCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is ObjectiveCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.objective_collection, container);
}

export type OrganizationContainer = Container<OrganizationPayload>;

export function isOrganizationContainer(
	container: AnyContainer | EmptyContainer
): container is OrganizationContainer {
	return isContainerWithPayloadType(payloadTypes.enum.organization, container);
}

export type OrganizationalUnitContainer = Container<OrganizationalUnitPayload>;

export function isOrganizationalUnitContainer(
	container: AnyContainer | EmptyContainer
): container is OrganizationalUnitContainer {
	return isContainerWithPayloadType(payloadTypes.enum.organizational_unit, container);
}

export type PageContainer = Container<PagePayload>;

export function isPageContainer(
	container: AnyContainer | EmptyContainer
): container is PageContainer {
	return isContainerWithPayloadType(payloadTypes.enum.page, container);
}

export type ProgressContainer = Container<ProgressPayload>;

export function isProgressContainer(
	container: AnyContainer | EmptyContainer
): container is ProgressContainer {
	return isContainerWithPayloadType(payloadTypes.enum.progress, container);
}

export type ReportContainer = Container<ReportPayload>;

export function isReportContainer(
	container: AnyContainer | EmptyContainer
): container is ReportContainer {
	return isContainerWithPayloadType(payloadTypes.enum.report, container);
}

export type RuleContainer = Container<RulePayload>;

export function isRuleContainer(
	container: AnyContainer | EmptyContainer
): container is RuleContainer {
	return isContainerWithPayloadType(payloadTypes.enum.rule, container);
}

export type ResourceContainer = Container<ResourcePayload>;

export function isResourceContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceContainer {
	return isContainerWithPayloadType(payloadTypes.enum.resource, container);
}

export type ResourceCollectionContainer = Container<ResourceCollectionPayload>;

export function isResourceCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.resource_collection, container);
}

export type ResourceDataContainer = Container<ResourceDataPayload>;

export function isResourceDataContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceDataContainer {
	return container.payload.type === payloadTypes.enum.resource_data;
}

export function isResourceDataActualResourceAllocationContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceDataContainer {
	return (
		isResourceDataContainer(container) &&
		container.payload.resourceDataType ===
			resourceDataTypes.enum['resource_data_type.actual_resource_allocation']
	);
}

export function isResourceDataPlannedResourceAllocationContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceDataContainer {
	return (
		isResourceDataContainer(container) &&
		container.payload.resourceDataType ===
			resourceDataTypes.enum['resource_data_type.planned_resource_allocation']
	);
}

export function isResourceDataBudgetContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceDataContainer {
	return (
		isResourceDataContainer(container) &&
		container.payload.resourceDataType === resourceDataTypes.enum['resource_data_type.budget']
	);
}

export function isResourceDataTotalBudgetContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceDataContainer {
	return (
		isResourceDataContainer(container) &&
		container.payload.resourceDataType === resourceDataTypes.enum['resource_data_type.total_budget']
	);
}

export function isResourceDataTotalBudgetForecastContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceDataContainer {
	return (
		isResourceDataContainer(container) &&
		container.payload.resourceDataType ===
			resourceDataTypes.enum['resource_data_type.total_budget_forecast']
	);
}

export type ResourceDataCollectionContainer = Container<ResourceDataCollectionPayload>;

export function isResourceDataCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is ResourceDataCollectionContainer {
	return container.payload.type === payloadTypes.enum.resource_data_collection;
}

export type ResourceV2Container = Container<ResourceV2Payload>;

export function isResourceV2Container(
	container: AnyContainer | EmptyContainer
): container is ResourceV2Container {
	return isContainerWithPayloadType(payloadTypes.enum.resource_v2, container);
}

export type SimpleMeasureContainer = Container<SimpleMeasurePayload>;

export function isSimpleMeasureContainer(
	container: AnyContainer | EmptyContainer
): container is SimpleMeasureContainer {
	return isContainerWithPayloadType(payloadTypes.enum.simple_measure, container);
}

export type SummaryContainer = Container<SummaryPayload>;

export function isSummaryContainer(
	container: AnyContainer | EmptyContainer
): container is SummaryContainer {
	return container.payload.type === payloadTypes.enum.summary;
}

export type ProgramContainer = Container<ProgramPayload>;

export function isProgramContainer(
	container: AnyContainer | EmptyContainer
): container is ProgramContainer {
	return isContainerWithPayloadType(payloadTypes.enum.program, container);
}

export type ProgramCollectionContainer = Container<ProgramCollectionPayload>;

export function isProgramCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is ProgramCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.program_collection, container);
}

export type TextContainer = Container<TextPayload>;

export function isTextContainer(
	container: AnyContainer | EmptyContainer
): container is TextContainer {
	return isContainerWithPayloadType(payloadTypes.enum.text, container);
}

export type TaskContainer = Container<TaskPayload>;

export function isTaskContainer(
	container: AnyContainer | EmptyContainer
): container is TaskContainer {
	return isContainerWithPayloadType(payloadTypes.enum.task, container);
}

export type TermContainer = Container<TermPayload>;

export function isTermContainer(
	container: AnyContainer | EmptyContainer
): container is TermContainer {
	return container.payload.type === payloadTypes.enum.term;
}

export type TaskCollectionContainer = Container<TaskCollectionPayload>;

export function isTaskCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is TaskCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.task_collection, container);
}

export type MeasureMonitoringContainer = EffectContainer | GoalContainer | TaskContainer;

export function isMeasureMonitoringContainer(
	container: AnyContainer | EmptyContainer
): container is MeasureMonitoringContainer {
	return isEffectContainer(container) || isGoalContainer(container) || isTaskContainer(container);
}

export type ImageContainer = Container<ImagePayload>;

export function isImageContainer(
	container: AnyContainer | EmptyContainer
): container is ImageContainer {
	return isContainerWithPayloadType(payloadTypes.enum.image, container);
}

export type TeaserContainer = Container<TeaserPayload>;

export function isTeaserContainer(
	container: AnyContainer | EmptyContainer
): container is TeaserContainer {
	return isContainerWithPayloadType(payloadTypes.enum.teaser, container);
}

export type InfoBoxContainer = Container<InfoBoxPayload>;

export function isInfoBoxContainer(
	container: AnyContainer | EmptyContainer
): container is InfoBoxContainer {
	return isContainerWithPayloadType(payloadTypes.enum.info_box, container);
}

export type TeaserHighlightContainer = Container<TeaserHighlightPayload>;

export function isTeaserHighlightContainer(
	container: AnyContainer | EmptyContainer
): container is TeaserHighlightContainer {
	return isContainerWithPayloadType(payloadTypes.enum.teaser_highlight, container);
}

export type ContentPartnerContainer = Container<ContentPartnerPayload>;

export function isContentPartnerContainer(
	container: AnyContainer | EmptyContainer
): container is ContentPartnerContainer {
	return isContainerWithPayloadType(payloadTypes.enum.content_partner, container);
}

export type ContentPartnerCollectionContainer = Container<ContentPartnerCollectionPayload>;

export function isContentPartnerCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is ContentPartnerCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.content_partner_collection, container);
}

export type ColContentContainer = Container<ColContentPayload>;

export function isColContentContainer(
	container: AnyContainer | EmptyContainer
): container is ColContentContainer {
	return isContainerWithPayloadType(payloadTypes.enum.col_content, container);
}

export type QuoteContainer = Container<QuotePayload>;

export function isQuoteContainer(
	container: AnyContainer | EmptyContainer
): container is QuoteContainer {
	return isContainerWithPayloadType(payloadTypes.enum.quote, container);
}

export type TeaserCollectionContainer = Container<TeaserCollectionPayload>;

export type CollectionContainer = Container<
	ContentPartnerCollectionPayload | TeaserCollectionPayload
>;

export type TeaserLikeContainer = Container<
	TeaserPayload | InfoBoxPayload | TeaserHighlightPayload | QuotePayload | ColContentPayload
>;

export function isTeaserLikeContainer(container: AnyContainer): container is TeaserLikeContainer {
	return (
		isContainerWithPayloadType(payloadTypes.enum.teaser, container) ||
		isContainerWithPayloadType(payloadTypes.enum.info_box, container) ||
		isContainerWithPayloadType(payloadTypes.enum.teaser_highlight, container) ||
		isContainerWithPayloadType(payloadTypes.enum.quote, container) ||
		isContainerWithPayloadType(payloadTypes.enum.col_content, container)
	);
}

export function isTeaserCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is TeaserCollectionContainer {
	return isContainerWithPayloadType(payloadTypes.enum.teaser_collection, container);
}

export function isCollectionContainer(
	container: AnyContainer | EmptyContainer
): container is CollectionContainer {
	return (
		isContainerWithPayloadType(payloadTypes.enum.content_partner_collection, container) ||
		isContainerWithPayloadType(payloadTypes.enum.teaser_collection, container)
	);
}

export function isContainer(container: AnyContainer | EmptyContainer): container is Container {
	return (
		container.payload.type !== payloadTypes.enum.organization &&
		container.payload.type !== payloadTypes.enum.organizational_unit
	);
}

function hasProperty(
	payload: AnyPayload | AnyInitialPayload,
	key: PropertyKey
): key is keyof AnyPayload {
	return (
		key in (anyPayload.options.map((o) => o.shape).find((s) => s.type.value == payload.type) ?? {})
	);
}

export type PayloadWithAudience = AnyPayload & { audience: Audience[] };

export type ContainerWithAudience = Container<PayloadWithAudience>;

export function isContainerWithAudience(
	container: AnyContainer | NewContainer
): container is ContainerWithAudience {
	return hasProperty(container.payload, 'audience');
}

export type PayloadWithBody = AnyPayload & { body: string | undefined };

export type ContainerWithBody = Container<PayloadWithBody>;

export function isContainerWithBody(
	container: AnyContainer | NewContainer
): container is ContainerWithBody {
	return hasProperty(container.payload, 'body');
}

export type PayloadWithSdg = AnyPayload & { sdg: SustainableDevelopmentGoal[] };

export type ContainerWithSdg = Container<PayloadWithSdg>;

export function isContainerWithSdg(
	container: AnyContainer | NewContainer
): container is ContainerWithSdg {
	return hasProperty(container.payload, 'sdg');
}

export type PayloadWithDescription = AnyPayload & { description: string | undefined };

export type ContainerWithDescription = Container<PayloadWithDescription>;

export function isContainerWithDescription(
	container: AnyContainer | NewContainer
): container is ContainerWithDescription {
	return hasProperty(container.payload, 'description');
}

export type PayloadWithDuration = AnyPayload & { startDate: string; endDate: string };

export type ContainerWithDuration = Container<PayloadWithDuration>;

export function isContainerWithDuration(
	container: AnyContainer | NewContainer
): container is ContainerWithDuration {
	return hasProperty(container.payload, 'startDate') && hasProperty(container.payload, 'endDate');
}

export type PayloadWithEditorialState = AnyPayload & { editorialState: EditorialState | undefined };

export type ContainerWithEditorialState = Container<PayloadWithEditorialState>;

export function isContainerWithEditorialState(
	container: AnyContainer | NewContainer
): container is ContainerWithEditorialState {
	return hasProperty(container.payload, 'editorialState');
}

export type PayloadWithFulfillmentDate = AnyPayload & { fulfillmentDate: string | undefined };

export type ContainerWithFulfillmentDate = Container<PayloadWithFulfillmentDate>;

export function isContainerWithFulfillmentDate(
	container: AnyContainer | NewContainer
): container is ContainerWithFulfillmentDate {
	return hasProperty(container.payload, 'fulfillmentDate');
}

export type PayloadWithHierarchyLevel = AnyPayload & { hierarchyLevel: number };

export type ContainerWithHierarchyLevel = Container<PayloadWithHierarchyLevel>;

export function isContainerWithHierarchyLevel(
	container: AnyContainer | NewContainer
): container is ContainerWithHierarchyLevel {
	return hasProperty(container.payload, 'hierarchyLevel');
}

export type PayloadWithName = AnyPayload & { name: string | undefined };

export type ContainerWithName = Container<PayloadWithName>;

export function isContainerWithName(
	container: AnyContainer | NewContainer
): container is ContainerWithName {
	return hasProperty(container.payload, 'name');
}

export type PayloadWithProgress = AnyPayload & { progress: number | undefined };

export type ContainerWithProgress = Container<PayloadWithProgress>;

export function isContainerWithProgress(
	container: AnyContainer | NewContainer
): container is ContainerWithProgress {
	return hasProperty(container.payload, 'progress');
}

export type PayloadWithStatus = AnyPayload & { status: Status };

export type ContainerWithStatus = Container<PayloadWithStatus>;

export function isContainerWithStatus(
	container: AnyContainer | NewContainer
): container is ContainerWithStatus {
	return hasProperty(container.payload, 'status');
}

export type PayloadWithSummary = AnyPayload & { summary: string | undefined };

export type ContainerWithSummary = Container<PayloadWithSummary>;

export function isContainerWithSummary(
	container: AnyContainer | NewContainer
): container is ContainerWithSummary {
	return hasProperty(container.payload, 'summary');
}

export type PayloadWithTitle = AnyPayload & { title: string | undefined };

export type ContainerWithTitle = Container<PayloadWithTitle>;

export function isContainerWithTitle(
	container: AnyContainer | NewContainer
): container is ContainerWithTitle {
	return hasProperty(container.payload, 'title');
}

export type PayloadWithTopic = AnyPayload & { topic: Topic[] };

export type ContainerWithTopic = Container<PayloadWithTopic>;

export function isContainerWithTopic(
	container: AnyContainer | NewContainer
): container is ContainerWithTopic {
	return hasProperty(container.payload, 'topic');
}

export const user = z.object({
	email: z.string().email().optional(),
	family_name: z.string().max(32).default(''),
	given_name: z.string().max(32).default(''),
	guid: z.string().uuid(),
	realm: z.string().max(1024),
	settings: z.object({
		features: z.array(z.string()).transform(deduplicate).optional()
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
	return createNewContainerSchema(anyInitialPayload).parse({
		managed_by: payloadType == payloadTypes.enum.organizational_unit ? organization : managedBy,
		organization,
		organizational_unit:
			payloadType == payloadTypes.enum.organizational_unit ? null : organizationalUnit,
		payload: { type: payloadType },
		realm
	}) as NewContainer;
}

export function mayDelete(container: Container<AnyPayload>, ability: MongoAbility) {
	return (
		container.relation.filter(
			({ predicate, object }) =>
				(predicate == predicates.enum['is-part-of'] ||
					predicate == predicates.enum['is-part-of-category'] ||
					predicate == predicates.enum['is-part-of-measure']) &&
				'guid' in container &&
				object == container.guid
		).length == 0 && ability.can('delete', container)
	);
}

export function newIndicatorTemplateFromIndicator(container: IndicatorContainer) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { historicalValues, quantity, ...copiedPayload } = container.payload;
	return createNewContainerSchema(indicatorTemplatePayload).parse({
		payload: { ...copiedPayload, type: payloadTypes.enum.indicator_template },
		organization: container.organization,
		organizational_unit: container.organization,
		realm: container.realm
	});
}

export function newCategoryTemplateFromCategory(
	category: CategoryContainer,
	organization: OrganizationContainer
) {
	const template = containerOfType(
		payloadTypes.enum.category,
		organization.guid,
		null,
		organization.guid,
		organization.realm
	) as NewContainer;
	const payload = category.payload;
	payload.visibility = visibility.enum.public;
	return template;
}

export function newTermForCategoryTemplate(
	term: TermContainer,
	categoryGuid: string,
	organization: OrganizationContainer,
	position: number
) {
	const template = containerOfType(
		payloadTypes.enum.term,
		organization.guid,
		null,
		organization.guid,
		organization.realm
	) as NewContainer;
	const payload = term.payload;
	payload.visibility = visibility.enum.public;
	template.relation = [
		{
			object: categoryGuid,
			position,
			predicate: predicates.enum['is-part-of-category']
		}
	];
	return template;
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
		copy.payload = {
			...(container.payload as typeof copy.payload),
			template: false
		} as typeof copy.payload;
	} else if (isTaskContainer(container)) {
		copy.payload = {
			...(container.payload as typeof copy.payload),
			assignee: [],
			taskStatus: taskStatus.enum['task_status.idea']
		} as typeof copy.payload;
	} else if (isIndicatorContainer(container)) {
		copy.payload = {
			...(container.payload as unknown as typeof copy.payload),
			historicalValues: []
		} as unknown as typeof copy.payload;
	} else if (isEffectContainer(container)) {
		copy.payload = {
			...(container.payload as typeof copy.payload),
			achievedValues: container.payload.achievedValues.map(
				([year]) => [year, 0] as [number, number]
			)
		} as typeof copy.payload;
	} else {
		copy.payload = { ...(container.payload as typeof copy.payload) } as typeof copy.payload;
	}

	copy.payload = {
		...copy.payload,
		...('fulfillmentDate' in container.payload ? { fulfillmentDate: undefined } : undefined)
	} as typeof copy.payload;

	copy.relation.push({
		object: container.guid,
		predicate: predicates.enum['is-copy-of'],
		position: 0
	});

	return copy;
}

/**
 * This function is used for creating columns for goals and measures based on
 * their hierarchy level. Objects without a hierarchy level like rules
 * might be mixed with measures in some boards. Those are assigned level 1.
 */
export function containersByHierarchyLevel<T extends Container>(containers: T[]) {
	const containersByHierarchyLevel = new Map<number, T[]>([[1, []]]);

	for (const container of containers) {
		const hierarchyLevel = isContainerWithHierarchyLevel(container)
			? container.payload.hierarchyLevel
			: 1;

		if (containersByHierarchyLevel.has(hierarchyLevel)) {
			containersByHierarchyLevel.set(hierarchyLevel, [
				...(containersByHierarchyLevel.get(hierarchyLevel) as T[]),
				container
			]);
		} else {
			containersByHierarchyLevel.set(hierarchyLevel, [container]);
		}
	}

	return containersByHierarchyLevel;
}

export function titleForProgramCollection(containers: ProgramContainer[]) {
	const programTypes = new Set(containers.map(({ payload }) => payload.programType));

	if (programTypes.size == 1) {
		const programType = programTypes.values().next().value;
		if (programType === undefined) {
			return unwrapFunctionStore(_)('programs');
		} else {
			return unwrapFunctionStore(_)(`${programType}.plural`);
		}
	} else {
		return unwrapFunctionStore(_)('programs');
	}
}

export function titleForGoalCollection(containers: GoalContainer[], hierarchyLevel: number) {
	const goalTypes = new Set(containers.map((c) => c.payload.goalType));

	if (goalTypes.size == 1) {
		const goalType = goalTypes.values().next().value;
		if (goalType === undefined) {
			if (hierarchyLevel) {
				return unwrapFunctionStore(_)('goals_by_hierarchy_level', {
					values: { level: hierarchyLevel }
				});
			} else {
				return unwrapFunctionStore(_)('goals');
			}
		} else {
			return unwrapFunctionStore(_)(goalType ? `${goalType}.plural` : 'goals');
		}
	} else if (hierarchyLevel) {
		return unwrapFunctionStore(_)('goals_by_hierarchy_level', {
			values: { level: hierarchyLevel }
		});
	} else {
		return unwrapFunctionStore(_)('goals');
	}
}

export function titleForMeasureCollection(containers: MeasureContainer[], hierarchyLevel: number) {
	const measureTypes = new Set(containers.map(({ payload }) => payload.measureType));

	if (measureTypes.size == 1) {
		const measureType = measureTypes.values().next().value;
		if (measureType === undefined) {
			if (hierarchyLevel) {
				return unwrapFunctionStore(_)('measure_by_hierarchy_level', {
					values: { level: hierarchyLevel }
				});
			} else {
				return unwrapFunctionStore(_)('measures');
			}
		} else {
			return unwrapFunctionStore(_)(`${measureType}.plural`);
		}
	} else if (hierarchyLevel) {
		return unwrapFunctionStore(_)('measure_by_hierarchy_level', {
			values: { level: hierarchyLevel }
		});
	} else {
		return unwrapFunctionStore(_)('payload_group.implementation');
	}
}

export function computeFacetCount(
	facets: Map<string, Map<string, number>>,
	containers: AnyContainer[],
	options?: { useCategoryPayload?: boolean }
) {
	const useCategoryPayload = options?.useCategoryPayload ?? false;
	const normalizeValue = (value: unknown): string => {
		if (value === null || value === undefined) return '';
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}
		if (typeof value === 'object') {
			const v = value as { guid?: unknown; value?: unknown };
			if (v.guid !== undefined) return String(v.guid);
			if (v.value !== undefined) return String(v.value);
		}
		return String(value);
	};

	for (const container of containers) {
		for (const key of facets.keys()) {
			const categoryPayload = useCategoryPayload
				? (container.payload as { category?: Record<string, unknown> }).category
				: undefined;
			const hasCategoryValue = categoryPayload && key in categoryPayload;
			const hasPayloadValue = key in container.payload;
			const valueSource = hasCategoryValue
				? categoryPayload?.[key]
				: hasPayloadValue
					? container.payload[key as keyof typeof container.payload]
					: undefined;
			if (valueSource !== undefined) {
				const foci = facets.get(key) as Map<string, number>;
				if (Array.isArray(valueSource)) {
					for (const value of valueSource) {
						const normalized = normalizeValue(value);
						foci.set(normalized, ((foci.get(normalized) as number) ?? 0) + 1);
					}
				} else {
					const normalized = normalizeValue(valueSource);
					foci.set(normalized, ((foci.get(normalized) as number) ?? 0) + 1);
				}
			}
		}
	}
	return facets;
}

export function getOrganizationURL(
	container: OrganizationContainer | OrganizationalUnitContainer,
	linkPath = '/all/page',
	env: { PUBLIC_BASE_URL: string; PUBLIC_DONT_USE_SUBDOMAINS: string }
): URL {
	const url = new URL(env.PUBLIC_BASE_URL ?? '');

	// Only use subdomains if the environment variable is not set
	if (!env.PUBLIC_DONT_USE_SUBDOMAINS) {
		const isDefaultOrganization = 'default' in container.payload && container.payload.default;

		// Default organization uses the base domain without subdomain
		if (!isDefaultOrganization) {
			url.hostname = `${container.organization}.${url.hostname}`;
		}
	}

	url.pathname = `/${container.guid}${linkPath}`
		.replace('/me/measures', '/measures/status')
		.replace('/me/tasks', '/tasks/status')
		.replace(/\/me$/, '/all/page');

	return url;
}
