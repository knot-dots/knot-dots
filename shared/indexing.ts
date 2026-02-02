import fs from 'node:fs';
import { Client } from '@elastic/elasticsearch';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { z } from 'zod';

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
          // Default to German so stemming and stop words match our labels/content
          default: { type: 'german' },
          default_search: { type: 'german' }
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
        validFrom: { type: 'date' },
        priority: { type: 'integer' },
        realm: { type: 'keyword' },
        organization: { type: 'keyword' },
        organizationalUnit: { type: 'keyword' },
        managedBy: { type: 'keyword' },
        type: { type: 'keyword' },
        title: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', normalizer: 'title_norm', ignore_above: 2048 }
          }
        },
        visibility: { type: 'keyword' },
        text: { type: 'text' },
        category_labels: { type: 'text' },
        topic_labels: { type: 'text' },
        audience_labels: { type: 'text' },
        policy_field_labels: { type: 'text' },
        program_type_labels: { type: 'text' },
        measure_type_labels: { type: 'text' },
        indicator_category_labels: { type: 'text' },
        indicator_type_labels: { type: 'text' },
        task_category_labels: { type: 'text' },
        payload: {
          properties: {
            audience: { type: 'keyword' },
            category: { type: 'keyword' },
            topic: { type: 'keyword' },
            level: { type: 'keyword' },
            policyFieldBNK: { type: 'keyword' },
            programType: { type: 'keyword' },
            indicatorCategory: { type: 'keyword' },
            indicatorType: { type: 'keyword' },
            taskCategory: { type: 'keyword' }
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

function sanitizeDates(obj: any) {
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (/Date$/.test(k)) {
        delete obj[k];
        continue;
      }
      if (Array.isArray(v)) v.forEach((item) => sanitizeDates(item));
      else if (v && typeof v === 'object') sanitizeDates(v);
    }
  }
}

export function normalizePayload(payload: any) {
  const normalized = { ...payload };
  for (const key of [
    'category', 'topic', 'audience', 'policyFieldBNK', 'programType',
    'indicatorCategory', 'indicatorType', 'taskCategory'
  ]) {
    const value = normalized[key];
    if (value === undefined || value === null) normalized[key] = [];
    else if (Array.isArray(value)) normalized[key] = value;
    else normalized[key] = [value];
  }
  sanitizeDates(normalized);
  return normalized;
}

export function toDoc(row: {
  guid: string; revision: number; realm: string; organization: string;
  organizational_unit?: string | null; managed_by: string; payload: any;
  valid_from?: string | Date | null; priority?: number | null;
}) {
  const normalized = normalizePayload(row.payload || {});
  const type: string | undefined = normalized?.type;
  const title: string | undefined = normalized?.title ?? normalized?.name;
  const description: string | undefined = normalized?.description;
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
  const categoryLabels = mapLabels(normalized.category);

  const additionalText = Object.entries(normalized)
    .filter(([, value]) => Array.isArray(value))
    .flatMap(([, value]) => (value as unknown[]))
    .filter((value): value is string => typeof value === 'string');

  return {
    guid: row.guid,
    revision: row.revision,
    realm: row.realm,
    organization: row.organization,
    organizationalUnit: row.organizational_unit ?? undefined,
    managedBy: row.managed_by,
    type,
    title,
    visibility,
    validFrom,
    priority,
    payload: normalized,
    category_labels: categoryLabels,
    topic_labels: topicLabels,
    audience_labels: audienceLabels,
    policy_field_labels: policyFieldLabels,
    program_type_labels: programTypeLabels,
    indicator_category_labels: indicatorCategoryLabels,
    indicator_type_labels: indicatorTypeLabels,
    task_category_labels: taskCategoryLabels,
    text: [
      title, description,
      ...categoryLabels,
      ...topicLabels,
      ...audienceLabels,
      ...policyFieldLabels,
      ...programTypeLabels,
      ...indicatorCategoryLabels,
      ...indicatorTypeLabels,
      ...taskCategoryLabels,
      ...additionalText
    ].filter(Boolean).join(' ')
  } as const;
}
