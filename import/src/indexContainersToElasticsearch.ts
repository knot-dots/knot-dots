import { Client } from '@elastic/elasticsearch';
import { sql } from 'slonik';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { z } from 'zod';
import { getPool } from './db';
import { createIndexWithMappings, toDoc } from '@knot-dots/shared/indexing';

interface Row {
	guid: string;
	revision: number;
	valid_from: string;
	priority: number | null;
	realm: string;
	organization: string;
	organizational_unit: string | null;
	managed_by: string;
	payload: any;
}

const envSchema = z
	.object({
		ELASTICSEARCH_INDEX_ALIAS: z.string().default('containers'),
		ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),
		ELASTICSEARCH_USERNAME: z.string().optional(),
		ELASTICSEARCH_PASSWORD: z.string().optional()
	})
	.transform((value) => ({
		aliasName: value.ELASTICSEARCH_INDEX_ALIAS,
		node: value.ELASTICSEARCH_URL,
		username: value.ELASTICSEARCH_USERNAME,
		password: value.ELASTICSEARCH_PASSWORD
	}));

const env = envSchema.parse(process.env);

async function* fetchContainers(batchSize = 500) {
	const pool = await getPool();
	let lastGuid: string | null = null;

	// We paginate by guid; it is indexed in migrations (container_guid_idx)
	for (;;) {
		const rows = (await pool.any(sql.unsafe`
      SELECT c.guid, c.revision, c.valid_from, tp.priority, c.realm, c.organization::text, c.organizational_unit::text, c.managed_by::text, c.payload
      FROM container c
      LEFT JOIN task_priority tp ON tp.task = c.guid
      WHERE deleted = false
        AND valid_currently
        AND (c.payload ->> 'type') IN (
          'effect',
          'goal',
          'help',
          'indicator',
          'indicator_template',
          'knowledge',
          'measure',
          'objective',
          'organization',
          'organizational_unit',
          'page',
          'program',
          'report',
          'resource',
          'resource_data'
          'resource_v2',
          'rule',
          'simple_measure',
          'task'
        )
        AND (${lastGuid ? sql.fragment`c.guid > ${lastGuid}::uuid` : sql.fragment`true`})
      ORDER BY c.guid
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
	const { aliasName, node, username, password } = env;
	const clientConfig: any = { node };

	if (username && password) {
		clientConfig.auth = {
			username,
			password
		};
	}

	const client = new Client(clientConfig);

	// Create a new timestamped physical index and point/switch the alias to it atomically after bulk.
	const timestamp = new Date()
		.toISOString()
		.replace(/[-:T.Z]/g, '')
		.slice(0, 14); // YYYYMMDDHHmmss
	const newIndexName = `${aliasName}-${timestamp}`;
	const exists = await client.indices.exists({ index: newIndexName });
	if (exists) {
		// Extremely unlikely collision; append random suffix
		const rand = Math.random().toString(36).slice(2, 6);
		const alt = `${newIndexName}-${rand}`;
		await createIndexWithMappings(client, alt);
		log.info({ index: alt }, '[indexer] Created index');
	} else {
		await createIndexWithMappings(client, newIndexName);
		log.info({ index: newIndexName }, '[indexer] Created index');
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
				log.error({ errorCount: errs.length, details }, '[indexer] Bulk had errors');
				throw new Error('Bulk indexing failed');
			}
			indexed += ops.length / 2;
			ops = [];
			log.info({ indexed }, '[indexer] Indexed documents');
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
			log.error({ errorCount: errs.length, details }, '[indexer] Bulk had errors');
			throw new Error('Bulk indexing failed');
		}
		indexed += ops.length / 2;
	}

	// Atomically switch alias to the new index; remove from any old indices.
	const currentAliases = await client.indices
		.getAlias({ name: aliasName })
		.catch(() => ({}) as any);
	// If a legacy physical index exists with the same name as the intended alias (e.g., 'containers'),
	// Elasticsearch forbids creating an alias with that name. Migrate by deleting the legacy index first.
	const aliasIndexExists = await client.indices.exists({ index: aliasName });
	if (aliasIndexExists && (!currentAliases || Object.keys(currentAliases).length === 0)) {
		log.warn({ aliasName }, '[indexer] Found legacy index. Deleting it to allow alias creation');
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
	log.info(
		{ indexed, newIndexName, aliasName },
		'[indexer] Done. Indexed documents and pointed alias to new index'
	);
}

run().catch((err) => {
	log.error(
		{ error: isErrorLike(err) ? serializeError(err) : String(err) },
		'[indexer] Fatal error'
	);
	process.exit(1);
});
