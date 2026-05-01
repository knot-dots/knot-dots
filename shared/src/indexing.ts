import fs from 'node:fs';
import { Client } from '@elastic/elasticsearch';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { z } from 'zod';
import type { Relation } from '@knot-dots/app/src/lib/models.ts';

const envSchema = z.object({
	DE_LABELS_PATH: z.string().default('/opt/labels/de.json')
});

const env = envSchema.parse(process.env);

// Shared label loading: German-only via DE_LABELS_PATH
let deLabels: Record<string, any> = {};
(function loadLabels() {
	const labelsPath = env.DE_LABELS_PATH;
	try {
		const contents = fs.readFileSync(labelsPath, 'utf-8');
		deLabels = JSON.parse(contents);
		log.info({ labelsPath }, '[shared:indexing] Loaded German labels');
	} catch (e) {
		log.warn(
			{ labelsPath, error: isErrorLike(e) ? serializeError(e) : String(e) },
			'[shared:indexing] Failed to load labels'
		);
		deLabels = {};
	}
})();

export function createIndexWithMappings(client: Client, index: string) {
	return client.indices.create({
		index,
		settings: {
			number_of_shards: 1,
			number_of_replicas: 0,
			analysis: {
				analyzer: {
					default: {
						type: 'custom',
						tokenizer: 'standard',
						filter: [
							'lowercase',
							'german_stop_words_filter',
							'german_decompounder',
							'german_normalization',
							'german_stemmer'
						]
					},
					default_search: {
						type: 'custom',
						tokenizer: 'standard',
						filter: [
							'lowercase',
							'german_stop_words_filter',
							'german_decompounder',
							'german_normalization',
							'german_stemmer'
						]
					}
				},
				filter: {
					german_stop_words_filter: {
						type: 'stop',
						stopwords: '_german_'
					},
					german_decompounder: {
						min_subword_size: 4,
						only_longest_match: true,
						word_list_path: 'dictionary/dictionary.txt',
						type: 'dictionary_decompounder'
					},
					german_stemmer: {
						type: 'stemmer',
						language: 'light_german'
					}
				},
				normalizer: {
					title_norm: {
						type: 'custom',
						filter: ['lowercase', 'asciifolding']
					}
				}
			}
		},
		mappings: {
			dynamic_templates: [
				{
					payload_category_values: {
						path_match: 'payload.category.*',
						match_mapping_type: 'string',
						mapping: { type: 'keyword', ignore_above: 2048 }
					}
				},
				{
					payload_strings: {
						path_match: 'payload.*',
						match_mapping_type: 'string',
						mapping: { type: 'keyword', ignore_above: 2048 }
					}
				}
			],
			dynamic: true,
			date_detection: false,
			properties: {
				guid: { type: 'keyword' },
				revision: { type: 'integer' },
				valid_from: { type: 'date' },
				priority: { type: 'integer' },
				realm: { type: 'keyword' },
				organization: { type: 'keyword' },
				organizational_unit: { type: 'keyword' },
				managed_by: { type: 'keyword' },
				type: { type: 'keyword' },
				title: {
					type: 'text',
					fields: {
						keyword: {
							type: 'keyword',
							normalizer: 'title_norm',
							ignore_above: 2048
						}
					}
				},
				visibility: { type: 'keyword' },
				text: { type: 'text' },
				sdg_labels: { type: 'text' },
				topic_labels: { type: 'text' },
				audience_labels: { type: 'text' },
				policy_field_labels: { type: 'text' },
				program_type_labels: { type: 'text' },
				measure_type_labels: { type: 'text' },
				indicator_category_labels: { type: 'text' },
				indicator_type_labels: { type: 'text' },
				task_category_labels: { type: 'text' },
				resource_category_labels: { type: 'text' },
				resource_unit_labels: { type: 'text' },
				relation: {
					type: 'nested',
					properties: {
						object: { type: 'keyword' },
						predicate: { type: 'keyword' },
						position: { type: 'integer' },
						subject: { type: 'keyword' }
					}
				},
				user: {
					type: 'nested',
					properties: {
						predicate: { type: 'keyword' },
						subject: { type: 'keyword' }
					}
				},
				payload: {
					properties: {
						audience: { type: 'keyword' },
						sdg: { type: 'keyword' },
						topic: { type: 'keyword' },
						level: { type: 'keyword' },
						policyFieldBNK: { type: 'keyword' },
						programType: { type: 'keyword' },
						indicatorCategory: { type: 'keyword' },
						indicatorType: { type: 'keyword' },
						taskCategory: { type: 'keyword' },
						resourceCategory: { type: 'keyword' },
						resourceUnit: { type: 'keyword' },
						category: { type: 'object', dynamic: true }
					}
				}
			}
		}
	});
}

function resolveLabel(code: string): string | undefined {
	const direct = deLabels[code];
	if (typeof direct === 'string') return direct;
	const parts = code.split('.');
	let cur: any = deLabels;
	for (const p of parts) {
		if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
		else return undefined;
	}
	return typeof cur === 'string' ? cur : undefined;
}

export function normalizePayload(payload: any) {
	const normalized = { ...payload };
	for (const key of [
		'sdg',
		'topic',
		'audience',
		'policyFieldBNK',
		'programType',
		'indicatorCategory',
		'indicatorType',
		'taskCategory',
		'resourceCategory',
		'resourceUnit'
	]) {
		const value = normalized[key];
		if (value === undefined || value === null) continue;
		else if (Array.isArray(value)) normalized[key] = value;
		else normalized[key] = [value];
	}
	const category = normalized.category;
	if (!category || typeof category !== 'object' || Array.isArray(category)) {
		normalized.category = {};
	} else {
		const normalizedCategory: Record<string, string[]> = {};
		for (const [key, value] of Object.entries(category as Record<string, unknown>)) {
			if (value === undefined || value === null) normalizedCategory[key] = [];
			else if (Array.isArray(value))
				normalizedCategory[key] = value.filter((v): v is string => typeof v === 'string');
			else if (typeof value === 'string') normalizedCategory[key] = [value];
			else normalizedCategory[key] = [];
		}
		normalized.category = normalizedCategory;
	}
	return normalized;
}

export function toDoc(row: {
	guid: string;
	revision: number;
	realm: string;
	organization: string;
	organizational_unit?: string | null;
	managed_by: string;
	payload: any;
	valid_from?: string | Date | null;
	priority?: number | null;
	relation?: Relation[];
	user?: { predicate: string; subject: string }[];
}) {
	const normalized = normalizePayload(row.payload || {});
	const originalPayload = { ...(row.payload || {}) };
	const type: string | undefined = normalized?.type;
	const title: string | undefined = normalized?.title ?? normalized?.name;
	const description: string | undefined = normalized?.description;
	const body: string | undefined = normalized?.body;
	const visibility: string | undefined = normalized?.visibility;
	const validFrom = row.valid_from ? new Date(row.valid_from).toISOString() : undefined;
	const priority = row.priority ?? undefined;

	const mapLabels = (arr?: string[]) => (arr || []).map(resolveLabel).filter(Boolean) as string[];
	const topicLabels = mapLabels(normalized.topic);
	const audienceLabels = mapLabels(normalized.audience);
	const policyFieldLabels = mapLabels(normalized.policyFieldBNK);
	const programTypeLabels = mapLabels(normalized.programType);
	const indicatorCategoryLabels = mapLabels(normalized.indicatorCategory);
	const indicatorTypeLabels = mapLabels(normalized.indicatorType);
	const taskCategoryLabels = mapLabels(normalized.taskCategory);
	const resourceCategoryLabels = mapLabels(normalized.resourceCategory);
	const resourceUnitLabels = mapLabels(normalized.resourceUnit);
	const sdgLabels = mapLabels(normalized.sdg);

	const additionalText = Object.entries(normalized)
		.filter(([, value]) => Array.isArray(value))
		.flatMap(([, value]) => value as unknown[])
		.filter((value): value is string => typeof value === 'string');
	const categoryValues = Object.values(
		(normalized.category as Record<string, string[]>) ?? {}
	).flat();

	const relation = (row.relation ?? []).map((r) => ({
		object: r.object,
		predicate: r.predicate,
		position: r.position,
		subject: r.subject
	}));

	const user = (row.user ?? []).map((u) => ({
		predicate: u.predicate,
		subject: u.subject
	}));

	return {
		guid: row.guid,
		revision: row.revision,
		realm: row.realm,
		organization: row.organization,
		organizational_unit: row.organizational_unit ?? undefined,
		managed_by: row.managed_by,
		type,
		title,
		visibility,
		valid_from: validFrom,
		priority,
		relation,
		user,
		payload: originalPayload,
		sdg_labels: sdgLabels,
		topic_labels: topicLabels,
		audience_labels: audienceLabels,
		policy_field_labels: policyFieldLabels,
		program_type_labels: programTypeLabels,
		indicator_category_labels: indicatorCategoryLabels,
		indicator_type_labels: indicatorTypeLabels,
		task_category_labels: taskCategoryLabels,
		resource_category_labels: resourceCategoryLabels,
		resource_unit_labels: resourceUnitLabels,
		text: [
			title,
			description,
			body,
			...sdgLabels,
			...topicLabels,
			...audienceLabels,
			...policyFieldLabels,
			...programTypeLabels,
			...indicatorCategoryLabels,
			...indicatorTypeLabels,
			...taskCategoryLabels,
			...resourceCategoryLabels,
			...resourceUnitLabels,
			...additionalText,
			...categoryValues
		]
			.filter(Boolean)
			.join(' ')
	} as const;
}
