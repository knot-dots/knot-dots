import { Client } from '@elastic/elasticsearch';
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'slonik';
import { getPool } from './db';

interface Row {
  guid: string;
  revision: number;
  realm: string;
  organization: string;
  organizational_unit: string | null;
  managed_by: string;
  payload: any;
}

function env(name: string, fallback?: string) {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var ${name}`);
}

async function createIndexWithMappings(client: Client, index: string) {
  await client.indices.create({
    index,
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0
    },
    mappings: {
      dynamic: true,
      date_detection: false,
      properties: {
        guid: { type: 'keyword' },
        revision: { type: 'integer' },
        realm: { type: 'keyword' },
        organization: { type: 'keyword' },
        organizationalUnit: { type: 'keyword' },
        managedBy: { type: 'keyword' },
        type: { type: 'keyword' },
        title: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        visibility: { type: 'keyword' },
        text: { type: 'text' },
        // Store localized SDG category labels for full-text matching (German-only per de.json)
        category_labels: { type: 'text' },
        // Additional facet labels for full-text matching
        topic_labels: { type: 'text' },
        audience_labels: { type: 'text' },
        policy_field_labels: { type: 'text' },
        program_type_labels: { type: 'text' },
        measure_type_labels: { type: 'text' },
        indicator_category_labels: { type: 'text' },
        indicator_type_labels: { type: 'text' },
        task_category_labels: { type: 'text' },
        // Explicit payload sub-field mappings for aggregation dimensions (arrays of keywords)
        payload: {
          properties: {
            audience: { type: 'keyword' },
            category: { type: 'keyword' },
            topic: { type: 'keyword' },
            level: { type: 'keyword' },
            policyFieldBNK: { type: 'keyword' },
            programType: { type: 'keyword' },
            measureType: { type: 'keyword' },
            indicatorCategory: { type: 'keyword' },
            indicatorType: { type: 'keyword' },
            taskCategory: { type: 'keyword' }
          }
        }
      }
    }
  });
}

// Load German labels from app locales (de.json) so we can index proper DE facet labels for full-text search.
// We resolve relative to the repository layout: import/ -> app/src/lib/locales/de.json
let deLabels: Record<string, string> = {};
// Require de.json via explicit env; no fallback. Fail fast if missing.
(() => {
  const labelsPath = process.env.DE_LABELS_PATH;
  if (!labelsPath || labelsPath.length === 0) {
    throw new Error('DE_LABELS_PATH is required and must point to de.json. Set it in environment.');
  }
  const contents = fs.readFileSync(labelsPath, 'utf-8');
  deLabels = JSON.parse(contents);
  // eslint-disable-next-line no-console
  console.log('[indexer] Loaded German labels from', labelsPath);
})();

function toDoc(row: Row) {
  const type: string | undefined = row.payload?.type;
  const title: string | undefined = row.payload?.title ?? row.payload?.name;
  const description: string | undefined = row.payload?.description;
  const visibility: string | undefined = row.payload?.visibility;

  // Normalize payload facet-like fields to always be arrays (so downstream code relying on arrays works uniformly).
  const normalized = { ...row.payload };
  for (const key of [
    'category',
    'topic',
    'audience',
    'policyFieldBNK',
    'programType',
    'measureType',
    'indicatorCategory',
    'indicatorType',
    'taskCategory'
  ]) {
    const value = (row.payload as any)?.[key];
    if (value === undefined || value === null) {
      normalized[key] = [];
    } else if (Array.isArray(value)) {
      normalized[key] = value;
    } else {
      normalized[key] = [value];
    }
  }
  // Recursively remove empty date strings (keys ending with 'Date') to avoid ES parsing errors.
  function sanitizeDates(obj: any) {
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (/Date$/.test(k)) {
          // Drop all date-suffixed fields to avoid ES dynamic date mapping conflicts.
          delete obj[k];
          continue;
        }
        if (Array.isArray(v)) {
          v.forEach((item) => sanitizeDates(item));
        } else if (v && typeof v === 'object') {
          sanitizeDates(v);
        }
      }
    }
  }
  sanitizeDates(normalized);
  // Category labels will use German labels only; require presence in de.json.
  const label = (code: string): string | undefined => {
    // First try direct flat key lookup (e.g., 'topic.cityscape')
    const direct = (deLabels as any)[code];
    if (typeof direct === 'string') return direct;
    // Otherwise resolve nested paths like 'sdg.01' or 'task_category.default'
    const parts = code.split('.');
    let cur: any = deLabels;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[indexer] Missing German label for code '${code}' in de.json`);
        return undefined;
      }
    }
    if (typeof cur === 'string') return cur;
    // eslint-disable-next-line no-console
    console.warn(`[indexer] Label for code '${code}' is not a string in de.json`);
    return undefined;
  };
  const topicLabels = (normalized.topic || []).map(label).filter(Boolean) as string[];
  const audienceLabels = (normalized.audience || []).map(label).filter(Boolean) as string[];
  const policyFieldLabels = (normalized.policyFieldBNK || []).map(label).filter(Boolean) as string[];
  const programTypeLabels = (normalized.programType || []).map(label).filter(Boolean) as string[];
  const measureTypeLabels = (normalized.measureType || []).map(label).filter(Boolean) as string[];
  const indicatorCategoryLabels = (normalized.indicatorCategory || []).map(label).filter(Boolean) as string[];
  const indicatorTypeLabels = (normalized.indicatorType || []).map(label).filter(Boolean) as string[];
  const taskCategoryLabels = (normalized.taskCategory || []).map(label).filter(Boolean) as string[];
  const categoryLabels = (normalized.category || []).map(label).filter(Boolean) as string[];
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
    payload: normalized,
    category_labels: categoryLabels,
    topic_labels: topicLabels,
    audience_labels: audienceLabels,
    policy_field_labels: policyFieldLabels,
    program_type_labels: programTypeLabels,
    measure_type_labels: measureTypeLabels,
    indicator_category_labels: indicatorCategoryLabels,
    indicator_type_labels: indicatorTypeLabels,
    task_category_labels: taskCategoryLabels,
    text: [
      title,
      description,
      ...categoryLabels,
      ...topicLabels,
      ...audienceLabels,
      ...policyFieldLabels,
      ...programTypeLabels,
      ...measureTypeLabels,
      ...indicatorCategoryLabels,
      ...indicatorTypeLabels,
      ...taskCategoryLabels
    ]
      .filter(Boolean)
      .join(' ')
  } as const;
}

async function* fetchContainers(batchSize = 500) {
  const pool = await getPool();
  let lastGuid: string | null = null;

  // We paginate by guid; it is indexed in migrations (container_guid_idx)
  for (;;) {
    const rows = (await pool.any(sql.unsafe`
      SELECT guid, revision, realm, organization::text, organizational_unit::text, managed_by::text, payload
      FROM container
      WHERE deleted = false
        AND valid_currently
        AND (payload ->> 'type') IN (
          'effect',
          'goal',
          'indicator',
          'knowledge',
          'measure',
          'objective',
          'organization',
          'organizational_unit',
          'page',
          'program',
          'progress',
          'resource',
          'rule',
          'simple_measure',
          'task'
        )
        AND (${lastGuid ? sql.fragment`guid > ${lastGuid}::uuid` : sql.fragment`true`})
      ORDER BY guid
      LIMIT ${batchSize}
    `)) as unknown as Row[];
 
    if (rows.length === 0) return;

    for (const r of rows) {
      lastGuid = r.guid;
      yield r;
    } 
  }
}

async function run() {
  const aliasName = env('ELASTICSEARCH_INDEX_ALIAS', 'containers');
  const node = env('ELASTICSEARCH_URL', 'http://localhost:9200');
  const client = new Client({ node });

  // Create a new timestamped physical index and point/switch the alias to it atomically after bulk.
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // YYYYMMDDHHmmss
  const newIndexName = `${aliasName}-${timestamp}`;
  const exists = await client.indices.exists({ index: newIndexName });
  if (exists) {
    // Extremely unlikely collision; append random suffix
    const rand = Math.random().toString(36).slice(2, 6);
    const alt = `${newIndexName}-${rand}`;
    await createIndexWithMappings(client, alt);
    // eslint-disable-next-line no-console
    console.log(`[indexer] Created index ${alt}`);
  } else {
    await createIndexWithMappings(client, newIndexName);
    // eslint-disable-next-line no-console
    console.log(`[indexer] Created index ${newIndexName}`);
  }

  let indexed = 0;
  let ops: any[] = [];

  for await (const row of fetchContainers()) {
    const doc = toDoc(row);
    ops.push({ index: { _index: newIndexName, _id: row.guid } });
    ops.push(doc);

    if (ops.length >= 1000) {
      const res = await client.bulk({ refresh: false, operations: ops });
      if (res.errors) {
        const errs = (res.items || []).filter(
          (i: any) => (i.index && i.index.error) || (i.create && i.create.error)
        );
        const details = errs.slice(0, 5).map((item: any) => {
          const e = item.index?.error || item.create?.error;
          return {
            id: item.index?._id || item.create?._id,
            type: item.index ? 'index' : 'create',
            reason: e?.reason,
            type_reason: e?.type,
            caused_by: e?.caused_by
          };
        });
        console.error('Bulk had errors (first 5):', details);
        throw new Error('Bulk indexing failed');
      }
      indexed += ops.length / 2;
      ops = [];
      process.stdout.write(`Indexed ${indexed} documents...\n`);
    }
  }

  if (ops.length > 0) {
    const res = await client.bulk({ refresh: true, operations: ops });
    if (res.errors) {
      const errs = (res.items || []).filter(
        (i: any) => (i.index && i.index.error) || (i.create && i.create.error)
      );
      const details = errs.slice(0, 5).map((item: any) => {
        const e = item.index?.error || item.create?.error;
        return {
          id: item.index?._id || item.create?._id,
          type: item.index ? 'index' : 'create',
          reason: e?.reason,
          type_reason: e?.type,
          caused_by: e?.caused_by
        };
      });
      console.error('Bulk had errors (first 5):', details);
      throw new Error('Bulk indexing failed');
    }
    indexed += ops.length / 2;
  }

  // Atomically switch alias to the new index; remove from any old indices.
  const currentAliases = await client.indices.getAlias({ name: aliasName }).catch(() => ({} as any));
  // If a legacy physical index exists with the same name as the intended alias (e.g., 'containers'),
  // Elasticsearch forbids creating an alias with that name. Migrate by deleting the legacy index first.
  const aliasIndexExists = await client.indices.exists({ index: aliasName });
  if (aliasIndexExists && (!currentAliases || Object.keys(currentAliases).length === 0)) {
    console.warn(`[indexer] Found legacy index named '${aliasName}'. Deleting it to allow alias creation.`);
    await client.indices.delete({ index: aliasName });
  }
  const removeActions: any[] = [];
  if (currentAliases && typeof currentAliases === 'object') {
    for (const idx of Object.keys(currentAliases)) {
      removeActions.push({ remove: { index: idx, alias: aliasName, must_exist: false } });
    }
  }
  const actions = [
    ...removeActions,
    { add: { index: newIndexName, alias: aliasName, is_write_index: true } }
  ];
  await client.indices.updateAliases({ actions });
  console.log(`Done. Indexed ${indexed} documents into ${newIndexName} and pointed alias '${aliasName}' to it.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
