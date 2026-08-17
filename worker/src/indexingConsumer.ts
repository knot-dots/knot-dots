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
import { toDoc } from '@knot-dots/shared/src/indexing.ts';
import { container, relation, userRelation } from '@knot-dots/app/src/lib/models.ts';

const containerRow = container
  .omit({ relation: true, user: true })
  .extend({ priority: z.number().int().nullable() });

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
    INDEXING_MAX_RECEIVE_COUNT: z.coerce.number().int().positive().default(10),
    INDEXING_BULK_MAX_RETRIES: z.coerce.number().int().positive().default(3),
    INDEXING_BULK_RETRY_BASE_MS: z.coerce.number().int().positive().default(500),
    INDEXING_MISSING_RETRY_DELAY_S: z.coerce.number().int().positive().default(30)
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
    bulkRetryBaseMs: value.INDEXING_BULK_RETRY_BASE_MS,
    missingRetryDelayS: value.INDEXING_MISSING_RETRY_DELAY_S
  }));

const env = envSchema.parse(process.env);

const { queueUrl, dlqUrl, region, endpoint, accessKeyId, secretAccessKey, esUrl, esUsername, esPassword, esIndex, pollIntervalMs, maxReceiveCount, bulkMaxRetries, bulkRetryBaseMs, missingRetryDelayS } = env;

let running = true;

process.on('SIGINT', () => {
  running = false;
});
process.on('SIGTERM', () => {
  running = false;
});

async function fetchContainerRow(guid: string) {
  const pool = await getPool();
  return pool.maybeOne(sql.type(containerRow)`
    SELECT c.*, tp.priority
    FROM container c
    LEFT JOIN task_priority tp ON tp.task = c.guid
    WHERE c.guid = ${guid}
      AND c.valid_currently
      AND NOT c.deleted
  `);
}

async function fetchContainerRelations(guid: string) {
  const pool = await getPool();
  return pool.any(sql.type(relation)`
    SELECT object, predicate, position, subject
    FROM container_relation
    WHERE (subject = ${guid} OR object = ${guid})
      AND valid_currently
      AND NOT deleted
    ORDER BY predicate, position, subject, object
  `);
}

async function fetchContainerUsers(revision: number) {
  const pool = await getPool();
  return pool.any(sql.type(userRelation)`
    SELECT predicate, subject
    FROM container_user
    WHERE object = ${revision}
  `);
}

type BatchEntry = { message: QueueMessage; event: IndexingEvent };

async function processBatch(entries: BatchEntry[], client: ESClient) {
  const processed: QueueMessage[] = [];
  const missing: BatchEntry[] = [];
  if (!entries.length) return { processed, missing };
  log.info({ eventCount: entries.length }, '[indexing-consumer] Processing batch of events');
  const operations: any[] = [];
  for (const { message, event: evt } of entries) {
    if (evt.action === 'delete') {
      operations.push({ delete: { _index: esIndex, _id: evt.guid } });
      processed.push(message);
      continue;
    }
    if (evt.action === 'upsert') {
      const row = await fetchContainerRow(evt.guid);
      if (!row) {
        // The row may belong to a transaction that has not committed yet
        // (e.g. a long-running copy of a whole program); keep the message
        // in the queue so the upsert is retried after the commit.
        missing.push({ message, event: evt });
        continue;
      }
      const relation = await fetchContainerRelations(evt.guid);
      const user = await fetchContainerUsers(row.revision);
      const doc = toDoc({
        guid: row.guid,
        revision: row.revision,
        valid_from: row.valid_from,
        priority: row.priority,
        realm: row.realm,
        organization: String(row.organization),
        organizational_unit: row.organizational_unit ?? null,
        managed_by: String(row.managed_by),
        payload: row.payload || {},
        relation: [...relation],
        user: [...user]
      });
      operations.push({ index: { _index: esIndex, _id: evt.guid } });
      operations.push(doc);
      processed.push(message);
      continue;
    }
    log.warn({ action: evt.action, guid: evt.guid }, '[indexing-consumer] Dropping event with unknown action');
    processed.push(message);
  }
  if (!operations.length) return { processed, missing };
  // Retry bulk on transient errors with exponential backoff
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await client.bulk({ operations, refresh: true });
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
    { operationCount: operations.length, eventCount: entries.length },
    '[indexing-consumer] Bulk processed'
  );
  return { processed, missing };
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
      const batchEntries: BatchEntry[] = [];
      const poison: QueueMessage[] = [];
      for (const m of messages) {
        try {
          if (!m.Body) continue;
          const evt = JSON.parse(m.Body) as IndexingEvent;
          batchEntries.push({ message: m, event: evt });
        } catch (e) {
          log.warn(
            { error: isErrorLike(e) ? serializeError(e) : String(e) },
            '[indexing-consumer] Failed to parse message body'
          );
          poison.push(m);
        }
      }
      // Process valid events; if it fails, decide what to do with messages
      const { processed, missing } = await processBatch(batchEntries, es);
      log.info(
        { eventCount: batchEntries.length, missingCount: missing.length },
        '[indexing-consumer] Successfully processed batch'
      );

      // Upserts whose container row is not committed yet stay in the queue:
      // shorten their visibility timeout so the retry happens quickly. Once a
      // message exceeds maxReceiveCount the container is assumed to never
      // materialize (rolled-back transaction) and it is given up on.
      const retry: QueueMessage[] = [];
      const exhausted: QueueMessage[] = [];
      for (const { message, event } of missing) {
        const receiveCountRaw = message.Attributes?.ApproximateReceiveCount;
        const receiveCount = receiveCountRaw ? Number(receiveCountRaw) : 1;
        if (receiveCount >= maxReceiveCount) {
          log.error(
            { guid: event.guid, receiveCount },
            '[indexing-consumer] Upsert dropped; container still missing after max retries'
          );
          exhausted.push(message);
        } else {
          log.warn(
            { guid: event.guid, receiveCount, retryDelayS: missingRetryDelayS },
            '[indexing-consumer] Upsert deferred; container missing (transaction may not be committed yet)'
          );
          retry.push(message);
        }
      }
      if (retry.length) {
        try {
          const retryEntries = retry
            .filter((m) => m.ReceiptHandle && m.MessageId)
            .map((m) => ({
              Id: m.MessageId!,
              ReceiptHandle: m.ReceiptHandle!,
              VisibilityTimeout: missingRetryDelayS
            }));
          if (retryEntries.length) {
            await sqs.send(
              new ChangeMessageVisibilityBatchCommand({ QueueUrl: queueUrl, Entries: retryEntries })
            );
          }
        } catch (e) {
          log.warn(
            { error: isErrorLike(e) ? serializeError(e) : String(e) },
            '[indexing-consumer] Failed to shorten visibility timeout for deferred upserts'
          );
        }
      }
      if (dlqUrl && exhausted.length) {
        for (const m of exhausted) {
          try {
            await sqs.send(new SendMessageCommand({ QueueUrl: dlqUrl, MessageBody: m.Body || '' }));
            log.warn('[indexing-consumer] Forwarded exhausted upsert to DLQ');
          } catch (e) {
            log.warn(
              { error: isErrorLike(e) ? serializeError(e) : String(e) },
              '[indexing-consumer] Failed to forward exhausted upsert to DLQ'
            );
          }
        }
      }

      // Delete processed and given-up messages; forward poison to DLQ or drop
      const toDelete = [...processed, ...exhausted, ...poison];
      if (toDelete.length) {
        const entries = toDelete
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
