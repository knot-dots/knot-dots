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
	payloadTypes.enum.indicator,
	payloadTypes.enum.resource_v2,
	payloadTypes.enum.binary_indicator,
	payloadTypes.enum.effect,
	payloadTypes.enum.objective,
	payloadTypes.enum.rule,
	payloadTypes.enum.text,
	payloadTypes.enum.category,
	payloadTypes.enum.term
] as const satisfies readonly PayloadType[];

export const mcpPayloadTypes = z.enum(mcpPayloadTypeValues);

export type McpPayloadType = z.infer<typeof mcpPayloadTypes>;

// Categories and their terms classify other containers rather than relate to
// them, so like the web application the relation tools leave them out.
export function isMcpRelatableType(type: PayloadType) {
	return (
		mcpPayloadTypes.safeParse(type).success &&
		type !== payloadTypes.enum.category &&
		type !== payloadTypes.enum.term
	);
}

// Slugs that identified categories and terms before their GUIDs did. The
// server still derives them from the title, but nothing reads them, so MCP
// neither shows nor takes them.
const legacyPayloadFields: Partial<Record<PayloadType, readonly string[]>> = {
	[payloadTypes.enum.category]: ['key'],
	[payloadTypes.enum.term]: ['value']
};

// The fields of a payload, or of its JSON Schema properties, without the
// legacy fields of its type.
export function withoutLegacyFields<T extends object>(type: PayloadType, fields: T): T {
	const legacy = legacyPayloadFields[type] ?? [];
	return Object.fromEntries(
		Object.entries(fields).filter(([field]) => !legacy.includes(field))
	) as T;
}
