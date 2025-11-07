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
  if (!exists) {
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
          text: { type: 'text' }
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
    payload: row.payload,
    text: [title, description].filter(Boolean).join(' ')
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
      WHERE deleted = false AND (${lastGuid ? sql.fragment`guid > ${lastGuid}::uuid` : sql.fragment`true`})
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
