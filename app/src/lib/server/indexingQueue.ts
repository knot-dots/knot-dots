import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { env as privateEnv } from '$env/dynamic/private';
import { z } from 'zod';

// Using dynamic import to avoid type errors before dependency is installed/built.
// Lazy loader wrapper – if dependency missing we no-op.
let SQSClient: any;
let SendMessageCommand: any;
async function loadSQS() {
	if (SQSClient && SendMessageCommand) return { SQSClient, SendMessageCommand };
	try {
		const mod = await import('@aws-sdk/client-sqs');
		SQSClient = mod.SQSClient;
		SendMessageCommand = mod.SendMessageCommand;
	} catch (e) {
		log.warn('[indexingQueue] SQS client module not available; events will be skipped');
		SQSClient = class {};
		SendMessageCommand = class {};
	}
	return { SQSClient, SendMessageCommand };
}

// Indexing event minimal schema. Extend if you later need hierarchy info.
export interface IndexingEvent {
	action: 'upsert' | 'delete';
	guid: string;
	type?: string; // payload type
	timestamp: string; // ISO string
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

let env: ReturnType<typeof envSchema.parse> | undefined;
let sqs: any | undefined;

function getEnv() {
	if (!env) {
		env = envSchema.parse(privateEnv);
	}
	return env;
}

async function getClient() {
	if (sqs) return sqs;
	const { region, endpoint, accessKeyId, secretAccessKey } = getEnv();
	const { SQSClient } = await loadSQS();
	sqs = new SQSClient({
		region,
		endpoint,
		credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
	});
	return sqs;
}

export async function enqueueIndexingEvent(event: IndexingEvent): Promise<void> {
	const { queueUrl } = getEnv();
	if (!queueUrl) {
		log.warn('[indexingQueue] INDEXING_QUEUE_URL not set, skipping event');
		return;
	}
	try {
		const client = await getClient();
		const body = JSON.stringify(event);
		const { SendMessageCommand } = await loadSQS();
		if (client.send) {
			await client.send(
				new SendMessageCommand({
					QueueUrl: queueUrl,
					MessageBody: body
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
		}
	} catch (error) {
		log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
	}
}
