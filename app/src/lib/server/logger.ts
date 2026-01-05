import opentelemetry from '@opentelemetry/api';
import type { Handle } from '@sveltejs/kit';
import { Roarr as log } from 'roarr';

export const withLogger: Handle = async ({ event, resolve }) => {
	const activeSpan = opentelemetry.trace.getActiveSpan();
	return log.adopt(
		() => resolve(event),
		activeSpan
			? { spanId: activeSpan.spanContext().spanId, traceId: activeSpan.spanContext().traceId }
			: undefined
	);
};
