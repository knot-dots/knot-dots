import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
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

export async function enqueueIndexingEvent(event: IndexingEvent) {
	const { queueUrl } = getEnv();

	try {
		await getClient().send(
			new SendMessageCommand({
				QueueUrl: queueUrl,
				MessageBody: JSON.stringify(event)
			})
		);
		log.info(
			{
				action: event.action,
				guid: event.guid,
				timestamp: event.timestamp
			},
			'[indexingQueue] Enqueued indexing event'
		);
	} catch (error) {
		log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
	}
}
