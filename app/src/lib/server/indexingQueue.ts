import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { env as privateEnv } from '$env/dynamic/private';

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

let sqs: any | undefined;
async function getClient() {
	if (sqs) return sqs;
	const queueRegion = privateEnv.INDEXING_QUEUE_REGION || 'fr-par';
	const endpoint = privateEnv.INDEXING_QUEUE_ENDPOINT;
	const accessKeyId = privateEnv.INDEXING_QUEUE_ACCESS_KEY || '';
	const secretAccessKey = privateEnv.INDEXING_QUEUE_SECRET_KEY || '';
	const { SQSClient } = await loadSQS();
	sqs = new SQSClient({
		region: queueRegion,
		...(endpoint ? { endpoint } : {}),
		credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
	});
	return sqs;
}

const queueUrl = privateEnv.INDEXING_QUEUE_URL || '';

export async function enqueueIndexingEvent(event: IndexingEvent): Promise<void> {
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
