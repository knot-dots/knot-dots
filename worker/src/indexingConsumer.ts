import { sql } from 'slonik';
import { getPool } from './db';
import type { IndexingEvent } from './types';

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
  type Message as QueueMessage
} from '@aws-sdk/client-sqs';
import { Client as ESClient } from '@elastic/elasticsearch';

const queueUrl = process.env.INDEXING_QUEUE_URL || '';
const region = process.env.INDEXING_QUEUE_REGION || 'fr-par';
const endpoint = process.env.INDEXING_QUEUE_ENDPOINT;
const accessKeyId = process.env.INDEXING_QUEUE_ACCESS_KEY || process.env.SCALEWAY_ACCESS_KEY || '';
const secretAccessKey = process.env.INDEXING_QUEUE_SECRET_KEY || process.env.SCALEWAY_SECRET_KEY || '';
const esUrl = process.env.ELASTICSEARCH_URL || '';
// Use alias for all read/write operations (no legacy index env fallback)
const esIndex = process.env.ELASTICSEARCH_INDEX_ALIAS || 'containers';
const pollIntervalMs = Number(process.env.INDEXING_WORKER_POLL_INTERVAL_MS || '2000');

let running = true;

process.on('SIGINT', () => {
  running = false;
});
process.on('SIGTERM', () => {
  running = false;
});

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log('[indexing-consumer]', ...args);
}

function warn(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.warn('[indexing-consumer]', ...args);
}

function error(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error('[indexing-consumer]', ...args);
}

async function fetchContainerDoc(guid: string) {
  const pool = await getPool();
  const row = await pool.maybeOne<any>(sql.unsafe`
    SELECT * FROM container
    WHERE guid = ${guid}
      AND valid_currently
      AND NOT deleted
  `);
  if (!row) return undefined;
  const payload = (row as any).payload || {};
  const title = payload.title || payload.name;
  const description = payload.description || '';
  return {
    guid: row.guid,
    revision: row.revision,
    realm: row.realm,
    organization: row.organization,
    organizationalUnit: row.organizational_unit ?? undefined,
    managedBy: row.managed_by,
    type: payload.type,
    title,
    visibility: payload.visibility,
    payload,
    text: [title, description].filter(Boolean).join(' ')
  };
}

async function processBatch(events: IndexingEvent[], client: ESClient) {
  if (!events.length) return;
  log('Processing batch of events', events.length);
  const operations: any[] = [];
  for (const evt of events) {
    if (evt.action === 'delete') {
      operations.push({ delete: { _index: esIndex, _id: evt.guid } });
      continue;
    }
    if (evt.action === 'upsert') {
      const doc = await fetchContainerDoc(evt.guid);
      if (!doc) {
        warn('Upsert skipped; container missing', evt.guid);
        continue;
      }
      operations.push({ index: { _index: esIndex, _id: evt.guid } });
      operations.push(doc);
    }
  }
  if (!operations.length) return;
  const res = await client.bulk({ operations });
  if (res.errors) {
    const failed = (res.items || []).filter((i: any) => i.index?.error || i.delete?.error);
    error('Bulk indexing encountered errors', failed.slice(0, 5));
    throw new Error('Bulk indexing failed');
  }
  log('Bulk processed', operations.length, 'operations for', events.length, 'events');
}

export async function startIndexingConsumer() {
  if (!queueUrl) {
    warn('Queue URL missing; consumer will not start');
    return;
  }
  if (!esUrl) {
    warn('Elasticsearch URL missing; consumer will not start');
    return;
  }

  const sqs = new SQSClient({
    region,
    ...(endpoint ? { endpoint } : {}),
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
  });
  const es = new ESClient({ node: esUrl });

  log('Started consumer loop with config', {
    queueUrl,
    region,
    endpoint,
    esUrl,
    esIndex,
    pollIntervalMs
  });

  while (running) {
    try {
      const res = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 60
        })
      );
      const messages: QueueMessage[] = res.Messages || [];
      log('Polled queue, received', messages.length, 'messages');
      if (!messages.length) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        continue;
      }
      const events: IndexingEvent[] = [];
      for (const m of messages) {
        try {
          if (!m.Body) continue;
          const evt = JSON.parse(m.Body) as IndexingEvent;
          events.push(evt);
        } catch (e) {
          warn('Failed to parse message body', e);
        }
      }
      await processBatch(events, es);
      log('Successfully processed batch with', events.length, 'events');

      if (messages.length) {
        const entries = messages
          .filter((m) => m.ReceiptHandle && m.MessageId)
          .map((m) => ({ Id: m.MessageId!, ReceiptHandle: m.ReceiptHandle! }));
        if (entries.length) {
          await sqs.send(new DeleteMessageBatchCommand({ QueueUrl: queueUrl, Entries: entries }));
        }
      }
    } catch (e) {
      error('Polling cycle error', (e as Error).message);
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  log('Consumer stopped');
}
