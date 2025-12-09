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
		// eslint-disable-next-line no-console
		console.warn('[indexingQueue] SQS client module not available; events will be skipped');
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
	const queueRegion = process.env.INDEXING_QUEUE_REGION || 'fr-par';
	const endpoint = process.env.INDEXING_QUEUE_ENDPOINT; // Scaleway SQS-compatible endpoint if provided
	const accessKeyId =
		process.env.INDEXING_QUEUE_ACCESS_KEY || process.env.SCALEWAY_ACCESS_KEY || '';
	const secretAccessKey =
		process.env.INDEXING_QUEUE_SECRET_KEY || process.env.SCALEWAY_SECRET_KEY || '';
	const { SQSClient } = await loadSQS();
	sqs = new SQSClient({
		region: queueRegion,
		...(endpoint ? { endpoint } : {}),
		credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
	});
	return sqs;
}

const queueUrl = process.env.INDEXING_QUEUE_URL || '';

export async function enqueueIndexingEvent(event: IndexingEvent): Promise<void> {
	if (!queueUrl) {
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.warn('[indexingQueue] INDEXING_QUEUE_URL not set, skipping event', event);
		}
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
					//MessageGroupId: event.guid,
					//MessageDeduplicationId: `${event.guid}-${event.action}-${event.timestamp}`.slice(0,128)
				})
			);
			if (process.env.NODE_ENV !== 'production') {
				// eslint-disable-next-line no-console
				console.info('[indexingQueue] Enqueued indexing event', {
					action: event.action,
					guid: event.guid,
					timestamp: event.timestamp
				});
			}
		}
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[indexingQueue] Failed to enqueue event', (e as Error).message);
	}
}
