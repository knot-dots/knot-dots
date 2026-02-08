import { sql } from 'slonik';
import { getPool } from './db.ts';
import type { IndexingEvent } from './types.ts';
import { z } from 'zod';

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
  ChangeMessageVisibilityBatchCommand,
  SendMessageCommand,
  type Message as QueueMessage
} from '@aws-sdk/client-sqs';
import { Client as ESClient } from '@elastic/elasticsearch';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { toDoc } from '@knot-dots/shared/indexing.ts';

const envSchema = z
  .object({
    INDEXING_QUEUE_URL: z.string(),
    INDEXING_DLQ_URL: z.string().optional(),
    INDEXING_QUEUE_REGION: z.string().default('fr-par'),
    INDEXING_QUEUE_ENDPOINT: z.string(),
    INDEXING_QUEUE_ACCESS_KEY: z.string(),
    INDEXING_QUEUE_SECRET_KEY: z.string(),
    ELASTICSEARCH_URL: z.string(),
    ELASTICSEARCH_USERNAME: z.string().optional(),
    ELASTICSEARCH_PASSWORD: z.string().optional(),
    ELASTICSEARCH_INDEX_ALIAS: z.string().default('containers'),
    INDEXING_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
    INDEXING_MAX_RECEIVE_COUNT: z.coerce.number().int().positive().default(5),
    INDEXING_BULK_MAX_RETRIES: z.coerce.number().int().positive().default(3),
    INDEXING_BULK_RETRY_BASE_MS: z.coerce.number().int().positive().default(500)
  })
  .transform((value) => ({
    queueUrl: value.INDEXING_QUEUE_URL,
    dlqUrl: value.INDEXING_DLQ_URL,
    region: value.INDEXING_QUEUE_REGION,
    endpoint: value.INDEXING_QUEUE_ENDPOINT,
    accessKeyId: value.INDEXING_QUEUE_ACCESS_KEY,
    secretAccessKey: value.INDEXING_QUEUE_SECRET_KEY,
    esUrl: value.ELASTICSEARCH_URL,
    esUsername: value.ELASTICSEARCH_USERNAME,
    esPassword: value.ELASTICSEARCH_PASSWORD,
    esIndex: value.ELASTICSEARCH_INDEX_ALIAS,
    pollIntervalMs: value.INDEXING_WORKER_POLL_INTERVAL_MS,
    maxReceiveCount: value.INDEXING_MAX_RECEIVE_COUNT,
    bulkMaxRetries: value.INDEXING_BULK_MAX_RETRIES,
    bulkRetryBaseMs: value.INDEXING_BULK_RETRY_BASE_MS
  }));

const env = envSchema.parse(process.env);

const { queueUrl, dlqUrl, region, endpoint, accessKeyId, secretAccessKey, esUrl, esUsername, esPassword, esIndex, pollIntervalMs, maxReceiveCount, bulkMaxRetries, bulkRetryBaseMs } = env;

let running = true;

process.on('SIGINT', () => {
  running = false;
});
process.on('SIGTERM', () => {
  running = false;
});

async function fetchContainerRow(guid: string) {
  const pool = await getPool();
  const row = await pool.maybeOne<any>(sql.unsafe`
    SELECT c.*, tp.priority
    FROM container c
    LEFT JOIN task_priority tp ON tp.task = c.guid
    WHERE c.guid = ${guid}
      AND c.valid_currently
      AND NOT c.deleted
  `);
  return row as any;
}

async function processBatch(events: IndexingEvent[], client: ESClient) {
  if (!events.length) return;
  log.info({ eventCount: events.length }, '[indexing-consumer] Processing batch of events');
  const operations: any[] = [];
  for (const evt of events) {
    if (evt.action === 'delete') {
      operations.push({ delete: { _index: esIndex, _id: evt.guid } });
      continue;
    }
    if (evt.action === 'upsert') {
      const row = await fetchContainerRow(evt.guid);
      if (!row) {
        log.warn({ guid: evt.guid }, '[indexing-consumer] Upsert skipped; container missing');
        continue;
      }
      const doc = toDoc({
        guid: row.guid,
        revision: row.revision,
        valid_from: row.valid_from,
        priority: row.priority,
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
        log.error({ failedCount: failed.length }, '[indexing-consumer] Bulk indexing encountered errors');
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
      log.warn(
        { attempt, maxRetries: bulkMaxRetries, delay, error: isErrorLike(e) ? serializeError(e) : String(e) },
        '[indexing-consumer] Bulk retry after error'
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  log.info(
    { operationCount: operations.length, eventCount: events.length },
    '[indexing-consumer] Bulk processed'
  );
}

export async function startIndexingConsumer() {
  if (!queueUrl) {
    log.warn('[indexing-consumer] Queue URL missing; consumer will not start');
    return;
  }
  if (!esUrl) {
    log.warn('[indexing-consumer] Elasticsearch URL missing; consumer will not start');
    return;
  }

  const sqs = new SQSClient({
    region,
    endpoint,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
  });
  
  const esClientConfig: any = { node: esUrl };
  
  if (esUsername && esPassword) {
    esClientConfig.auth = {
      username: esUsername,
      password: esPassword
    };
  }
  
  const es = new ESClient(esClientConfig);

  log.info(
    {
      queueUrl,
      region,
      endpoint,
      esUrl,
      esIndex,
      pollIntervalMs
    },
    '[indexing-consumer] Started consumer loop'
  );

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
      log.info({ messageCount: messages.length }, '[indexing-consumer] Polled queue');
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
        log.warn(
          { error: isErrorLike(e) ? serializeError(e) : String(e) },
          '[indexing-consumer] Failed to extend visibility timeout'
        );
      }
      const events: IndexingEvent[] = [];
      const poison: QueueMessage[] = [];
      for (const m of messages) {
        try {
          if (!m.Body) continue;
          const evt = JSON.parse(m.Body) as IndexingEvent;
          events.push(evt);
        } catch (e) {
          log.warn(
            { error: isErrorLike(e) ? serializeError(e) : String(e) },
            '[indexing-consumer] Failed to parse message body'
          );
          poison.push(m);
        }
      }
      // Process valid events; if it fails, decide what to do with messages
      await processBatch(events, es);
      log.info({ eventCount: events.length }, '[indexing-consumer] Successfully processed batch');

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
                log.warn('[indexing-consumer] Forwarded poison message to DLQ');
              } catch (e) {
                log.warn(
                  { error: isErrorLike(e) ? serializeError(e) : String(e) },
                  '[indexing-consumer] Failed to forward poison message to DLQ'
                );
              }
            }
          }
        }
      }
    } catch (e) {
      log.error(
        { error: isErrorLike(e) ? serializeError(e) : String(e) },
        '[indexing-consumer] Polling cycle error'
      );
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  log.info('[indexing-consumer] Consumer stopped');
}
