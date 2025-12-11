import { sql } from 'slonik';
import { getPool } from './db';
import type { IndexingEvent } from './types';

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
  ChangeMessageVisibilityBatchCommand,
  SendMessageCommand,
  type Message as QueueMessage
} from '@aws-sdk/client-sqs';
import { Client as ESClient } from '@elastic/elasticsearch';
import { toDoc } from './shared/indexing';

const queueUrl = process.env.INDEXING_QUEUE_URL || '';
const dlqUrl = process.env.INDEXING_DLQ_URL || '';
const region = process.env.INDEXING_QUEUE_REGION || 'fr-par';
const endpoint = process.env.INDEXING_QUEUE_ENDPOINT;
const accessKeyId = process.env.INDEXING_QUEUE_ACCESS_KEY || process.env.SCALEWAY_ACCESS_KEY || '';
const secretAccessKey = process.env.INDEXING_QUEUE_SECRET_KEY || process.env.SCALEWAY_SECRET_KEY || '';
const esUrl = process.env.ELASTICSEARCH_URL || '';
// Use alias for all read/write operations (no legacy index env fallback)
const esIndex = process.env.ELASTICSEARCH_INDEX_ALIAS || 'containers';
const pollIntervalMs = Number(process.env.INDEXING_WORKER_POLL_INTERVAL_MS || '2000');
const maxReceiveCount = Number(process.env.INDEXING_MAX_RECEIVE_COUNT || '5');
const bulkMaxRetries = Number(process.env.INDEXING_BULK_MAX_RETRIES || '3');
const bulkRetryBaseMs = Number(process.env.INDEXING_BULK_RETRY_BASE_MS || '500');

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

async function fetchContainerRow(guid: string) {
  const pool = await getPool();
  const row = await pool.maybeOne<any>(sql.unsafe`
    SELECT * FROM container
    WHERE guid = ${guid}
      AND valid_currently
      AND NOT deleted
  `);
  return row as any;
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
      const row = await fetchContainerRow(evt.guid);
      if (!row) {
        warn('Upsert skipped; container missing', evt.guid);
        continue;
      }
      const doc = toDoc({
        guid: row.guid,
        revision: row.revision,
        realm: row.realm,
        organization: String(row.organization),
        organizational_unit: row.organizational_unit ?? null,
        managed_by: String(row.managed_by),
        payload: (row as any).payload || {}
      });
      operations.push({ index: { _index: esIndex, _id: evt.guid } });
      operations.push(doc);
    }
  }
  if (!operations.length) return;
  // Retry bulk on transient errors with exponential backoff
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await client.bulk({ operations });
      if (res.errors) {
        const failed = (res.items || []).filter((i: any) => i.index?.error || i.delete?.error);
        error('Bulk indexing encountered errors', failed.slice(0, 5));
        throw new Error('Bulk indexing failed');
      }
      break;
    } catch (e: any) {
      attempt++;
      const isRetryable = e?.statusCode === 429 || (e?.statusCode >= 500 && e?.statusCode < 600);
      if (!isRetryable || attempt > bulkMaxRetries) {
        throw e;
      }
      const delay = bulkRetryBaseMs * Math.pow(2, attempt - 1);
      warn(`Bulk retry ${attempt}/${bulkMaxRetries} after error: ${e?.message || e}. Waiting ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
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
          VisibilityTimeout: 60,
          AttributeNames: ['All'],
          MessageAttributeNames: ['All']
        })
      );
      const messages: QueueMessage[] = res.Messages || [];
      log('Polled queue, received', messages.length, 'messages');
      if (!messages.length) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        continue;
      }
      // Extend visibility while we process to reduce race conditions for big batches
      try {
        const visEntries = messages
          .filter((m) => m.ReceiptHandle && m.MessageId)
          .map((m) => ({ Id: m.MessageId!, ReceiptHandle: m.ReceiptHandle!, VisibilityTimeout: 300 }));
        if (visEntries.length) {
          await sqs.send(new ChangeMessageVisibilityBatchCommand({ QueueUrl: queueUrl, Entries: visEntries }));
        }
      } catch (e) {
        warn('Failed to extend visibility timeout', (e as Error).message);
      }
      const events: IndexingEvent[] = [];
      const poison: QueueMessage[] = [];
      for (const m of messages) {
        try {
          if (!m.Body) continue;
          const evt = JSON.parse(m.Body) as IndexingEvent;
          events.push(evt);
        } catch (e) {
          warn('Failed to parse message body', e);
          poison.push(m);
        }
      }
      // Process valid events; if it fails, decide what to do with messages
      await processBatch(events, es);
      log('Successfully processed batch with', events.length, 'events');

      // Delete processed messages; forward poison to DLQ or drop
      if (messages.length) {
        const entries = messages
          .filter((m) => m.ReceiptHandle && m.MessageId)
          .map((m) => ({ Id: m.MessageId!, ReceiptHandle: m.ReceiptHandle! }));
        if (entries.length) {
          await sqs.send(new DeleteMessageBatchCommand({ QueueUrl: queueUrl, Entries: entries }));
        }
        // Forward parsing failures to DLQ if configured and over max receive count
        if (dlqUrl && poison.length) {
          for (const m of poison) {
            const receiveCountRaw = m.Attributes?.ApproximateReceiveCount;
            const receiveCount = receiveCountRaw ? Number(receiveCountRaw) : 1;
            if (receiveCount >= maxReceiveCount) {
              try {
                await sqs.send(new SendMessageCommand({ QueueUrl: dlqUrl, MessageBody: m.Body || '' }));
                warn('Forwarded poison message to DLQ');
              } catch (e) {
                warn('Failed to forward poison message to DLQ', (e as Error).message);
              }
            }
          }
        }
      }
    } catch (e) {
      error('Polling cycle error', (e as Error).message);
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  log('Consumer stopped');
}
