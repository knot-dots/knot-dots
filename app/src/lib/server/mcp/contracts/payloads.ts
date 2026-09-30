import { z } from 'zod';
import { payloadTypes, type PayloadType } from '$lib/models';

export const mcpPayloadTypeValues = [
	payloadTypes.enum.page,
	payloadTypes.enum.program,
	payloadTypes.enum.goal,
	payloadTypes.enum.measure,
	payloadTypes.enum.simple_measure,
	payloadTypes.enum.task,
	payloadTypes.enum.knowledge,
	payloadTypes.enum.indicator_template,
	payloadTypes.enum.resource_v2
] as const satisfies readonly PayloadType[];

export const mcpPayloadTypes = z.enum(mcpPayloadTypeValues);

export type McpPayloadType = z.infer<typeof mcpPayloadTypes>;
