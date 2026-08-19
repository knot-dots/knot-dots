import { beforeEach, expect, test, vi } from 'vitest';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('$env/dynamic/private', () => ({
	env: {
		INDEXING_QUEUE_ENDPOINT: 'http://localhost:9324',
		INDEXING_QUEUE_REGION: 'test',
		INDEXING_QUEUE_URL: 'http://localhost:9324/queue/indexing'
	}
}));

vi.mock('@aws-sdk/client-sqs', () => ({
	SendMessageBatchCommand: class SendMessageBatchCommand {
		input: unknown;

		constructor(input: unknown) {
			this.input = input;
		}
	},
	SQSClient: class SQSClient {
		send = send;
	}
}));

import { enqueueIndexingEvent, enqueueIndexingEvents } from '$lib/server/indexingQueue';

function event(index: number) {
	return {
		action: 'upsert' as const,
		guid: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
		timestamp: '2026-08-12T00:00:00.000Z'
	};
}

beforeEach(() => {
	send.mockReset();
	send.mockImplementation(async (command: { input: { Entries: Array<{ Id: string }> } }) => ({
		Failed: [],
		Successful: command.input.Entries.map(({ Id }) => ({ Id }))
	}));
});

test('does not send an empty batch', async () => {
	await expect(enqueueIndexingEvents([])).resolves.toEqual({ failed: 0, successful: 0 });
	expect(send).not.toHaveBeenCalled();
});

test('deduplicates events and sends at most ten per request', async () => {
	const events = [...Array.from({ length: 23 }, (_, index) => event(index)), event(0)];

	await expect(enqueueIndexingEvents(events)).resolves.toEqual({ failed: 0, successful: 23 });
	expect(send).toHaveBeenCalledTimes(3);
	expect(
		send.mock.calls.map(([command]) =>
			(command as { input: { Entries: Array<{ Id: string }> } }).input.Entries.map(({ Id }) => Id)
		)
	).toEqual([
		['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
		['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
		['0', '1', '2']
	]);
});

test('counts per-entry failures returned with a successful request', async () => {
	send.mockResolvedValueOnce({
		Failed: [{ Code: 'InternalError', Id: '1', Message: 'failed', SenderFault: false }],
		Successful: [{ Id: '0' }]
	});

	await expect(enqueueIndexingEvents([event(0), event(1)])).resolves.toEqual({
		failed: 1,
		successful: 1
	});
});

test('counts a thrown request as failed without rejecting', async () => {
	send.mockRejectedValueOnce(new Error('queue unavailable'));

	await expect(enqueueIndexingEvents([event(0), event(1)])).resolves.toEqual({
		failed: 2,
		successful: 0
	});
});

test('keeps the single-event compatibility API', async () => {
	await expect(enqueueIndexingEvent(event(0))).resolves.toEqual({ failed: 0, successful: 1 });
	expect(send).toHaveBeenCalledTimes(1);
});
