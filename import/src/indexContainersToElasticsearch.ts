import { Client } from '@elastic/elasticsearch';
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

async function ensureIndex(client: Client, index: string) {
  const exists = await client.indices.exists({ index });
  // Allow forced recreation to adopt new mapping (drop deprecated facets.* fields)
  if (exists && process.env.ELASTICSEARCH_RECREATE === 'true') {
    await client.indices.delete({ index });
  }
  const finalExists = await client.indices.exists({ index });
  if (!finalExists) {
    await client.indices.create({
      index,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0
      },
      mappings: {
        dynamic: true,
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
          // Store localized SDG category labels for full-text matching (both languages merged)
          category_labels: { type: 'text' },
          // Explicit payload sub-field mappings for aggregation dimensions (arrays of keywords)
          payload: {
            properties: {
              audience: { type: 'keyword' },
              category: { type: 'keyword' },
              topic: { type: 'keyword' },
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
}

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
  // Localized SDG (category) labels. Hard-coded here to avoid coupling import service to app locales.
  const sdgEn: Record<string, string> = {
    '01': 'No poverty',
    '02': 'Zero hunger',
    '03': 'Good health and well-being',
    '04': 'Quality Education',
    '05': 'Gender equality',
    '06': 'Clean water and sanitation',
    '07': 'Affordable clean energy',
    '08': 'Decent work and economic growth',
    '09': 'Industry, innovation and infrastructure',
    '10': 'Reduce inequalities',
    '11': 'Sustainable cities and communities',
    '12': 'Responsible consumption and production',
    '13': 'Climate action',
    '14': 'Life below water',
    '15': 'Life on land',
    '16': 'Peace, justice and strong institutions',
    '17': 'Partnerships for the goals'
  };
  const sdgDe: Record<string, string> = {
    '01': '1 - Keine Armut',
    '02': '2 - Kein Hunger',
    '03': '3 - Gesundheit und Wohlergehen',
    '04': '4 - Hochwertige Bildung',
    '05': '5 - Geschlechtergleichheit',
    '06': '6 - Sauberes Wasser und Sanitäreinrichtungen',
    '07': '7 - Bezahlbare und saubere Energie',
    '08': '8 - Menschenwürdige Arbeit und Wirtschaftswachstum',
    '09': '9 - Industrie, Innovation und Infrastruktur',
    '10': '10 - Weniger Ungleichheiten',
    '11': '11 - Nachhaltige Städte und Gemeinden',
    '12': '12 - Nachhaltige/r Konsum und Produktion',
    '13': '13 - Maßnahmen zum Klimaschutz',
    '14': '14 - Leben unter Wasser',
    '15': '15 - Leben an Land',
    '16': '16 - Frieden, Gerechtigkeit und starke Institutionen',
    '17': '17 - Partnerschaften zur Erreichung der Ziele'
  };
  const categoryCodes: string[] = normalized.category ?? [];
  const categoryLabels = Array.from(
    new Set(
      categoryCodes.flatMap((code) => {
        const id = code.split('.')[1];
        return [sdgEn[id], sdgDe[id]].filter(Boolean);
      })
    )
  );
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
    text: [title, description, ...categoryLabels].filter(Boolean).join(' ')
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
  const indexName = env('ELASTICSEARCH_INDEX_CONTAINERS', 'containers');
  const node = env('ELASTICSEARCH_URL', 'http://localhost:9200');
  const client = new Client({ node });

  await ensureIndex(client, indexName);

  let indexed = 0;
  let ops: any[] = [];

  for await (const row of fetchContainers()) {
    const doc = toDoc(row);
    ops.push({ index: { _index: indexName, _id: row.guid } });
    ops.push(doc);

    if (ops.length >= 1000) {
      const res = await client.bulk({ refresh: false, operations: ops });
      if (res.errors) {
        const errs = res.items?.filter((i: any) => (i.index && i.index.error) || (i.create && i.create.error));
        console.error('Bulk had errors:', errs?.slice(0, 5));
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
      const errs = res.items?.filter((i: any) => (i.index && i.index.error) || (i.create && i.create.error));
      console.error('Bulk had errors:', errs?.slice(0, 5));
      throw new Error('Bulk indexing failed');
    }
    indexed += ops.length / 2;
  }

  console.log(`Done. Indexed ${indexed} documents into ${indexName}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
