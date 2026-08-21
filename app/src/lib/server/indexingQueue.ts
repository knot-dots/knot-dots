import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { env as privateEnv } from '$env/dynamic/private';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { z } from 'zod';

export interface IndexingEvent {
	action: 'upsert' | 'delete';
	guid: string;
	type?: string;
	timestamp: string;
}

const envSchema = z
	.object({
		INDEXING_QUEUE_URL: z.string(),
		INDEXING_QUEUE_REGION: z.string().default('fr-par'),
		INDEXING_QUEUE_ENDPOINT: z.string(),
		INDEXING_QUEUE_ACCESS_KEY: z.string().optional(),
		INDEXING_QUEUE_SECRET_KEY: z.string().optional()
	})
	.transform((value) => ({
		queueUrl: value.INDEXING_QUEUE_URL,
		region: value.INDEXING_QUEUE_REGION,
		endpoint: value.INDEXING_QUEUE_ENDPOINT,
		accessKeyId: value.INDEXING_QUEUE_ACCESS_KEY,
		secretAccessKey: value.INDEXING_QUEUE_SECRET_KEY
	}));

let env: ReturnType<typeof envSchema.parse>;
let sqs: SQSClient;

function getEnv() {
	if (!env) {
		env = envSchema.parse(privateEnv);
	}
	return env;
}

function getClient() {
	if (!sqs) {
		const { region, endpoint, accessKeyId, secretAccessKey } = getEnv();
		sqs = new SQSClient({
			region,
			endpoint,
			credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
		});
	}
	return sqs;
}

function indexingEventKey(event: IndexingEvent) {
	return `${event.action}\u0000${event.guid}`;
}

export async function enqueueIndexingEvents(
	events: readonly IndexingEvent[]
): Promise<{ failed: number; successful: number }> {
	const uniqueEvents = [
		...new Map(events.map((event) => [indexingEventKey(event), event])).values()
	];
	let failed = 0;
	let successful = 0;

	for (let offset = 0; offset < uniqueEvents.length; offset += 10) {
		const batch = uniqueEvents.slice(offset, offset + 10);

		try {
			const { queueUrl } = getEnv();
			const result = await getClient().send(
				new SendMessageBatchCommand({
					Entries: batch.map((event, index) => ({
						Id: String(index),
						MessageBody: JSON.stringify(event)
					})),
					QueueUrl: queueUrl
				})
			);

			const failedEntries = result.Failed ?? [];
			failed += failedEntries.length;
			successful += result.Successful?.length ?? batch.length - failedEntries.length;

			if (failedEntries.length > 0) {
				log.error(
					{
						failedEntries: failedEntries.map(({ Code, Id, Message, SenderFault }) => ({
							code: Code,
							id: Id,
							message: Message,
							senderFault: SenderFault
						}))
					},
					'[indexingQueue] Some indexing events could not be enqueued'
				);
			}
		} catch (error) {
			failed += batch.length;
			log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
		}
	}

	if (successful > 0) {
		log.info({ failed, successful }, '[indexingQueue] Enqueued indexing events');
	}

	return { failed, successful };
}

export async function enqueueIndexingEvent(event: IndexingEvent) {
	return enqueueIndexingEvents([event]);
}
