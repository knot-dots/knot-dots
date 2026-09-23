import {
	ResourceNotFoundError,
	ResourceTemplate,
	type McpServer
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getPayloadSchema, payloadTypes, type PayloadType } from '$lib/models';

export const mcpPayloadSchemaTypes = [
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

export const payloadSchemaCatalogUri = 'knotdots://schemas/payloads';

const payloadSchemaTypeSet = new Set<PayloadType>(mcpPayloadSchemaTypes);

function payloadSchemaUri(payloadType: (typeof mcpPayloadSchemaTypes)[number]) {
	return `${payloadSchemaCatalogUri}/${payloadType}`;
}

function isMcpPayloadSchemaType(value: string): value is (typeof mcpPayloadSchemaTypes)[number] {
	return payloadSchemaTypeSet.has(value as PayloadType);
}

const catalog = {
	description:
		'Canonical payload validation schemas exposed through MCP. Schema availability does not imply that an MCP creation tool is available.',
	payloads: mcpPayloadSchemaTypes.map((type) => ({ type, uri: payloadSchemaUri(type) })),
	schemaVersion: 1
};

const jsonSchemas = new Map(
	mcpPayloadSchemaTypes.map(
		(type) =>
			[
				type,
				{
					...z.toJSONSchema(getPayloadSchema(type), {
						io: 'input',
						target: 'draft-2020-12'
					}),
					$id: payloadSchemaUri(type)
				}
			] as const
	)
);

export function registerPayloadSchemaResources(server: McpServer) {
	server.registerResource(
		'payload-schema-catalog',
		payloadSchemaCatalogUri,
		{
			description: 'Lists the payload schemas available as MCP resources.',
			mimeType: 'application/json',
			title: 'Payload schema catalog'
		},
		(uri) => ({
			contents: [
				{
					mimeType: 'application/json',
					text: JSON.stringify(catalog),
					uri: uri.href
				}
			]
		})
	);

	server.registerResource(
		'payload-schema',
		new ResourceTemplate(`${payloadSchemaCatalogUri}/{type}`, {
			complete: {
				type: (value) => mcpPayloadSchemaTypes.filter((type) => type.startsWith(value))
			},
			list: undefined
		}),
		{
			description: 'JSON Schema for a canonical Knot Dots payload.',
			mimeType: 'application/schema+json',
			title: 'Payload schema'
		},
		(uri, variables) => {
			const payloadType = variables.type;
			if (typeof payloadType !== 'string' || !isMcpPayloadSchemaType(payloadType)) {
				throw new ResourceNotFoundError(uri.href);
			}
			const schema = jsonSchemas.get(payloadType);
			if (!schema) throw new ResourceNotFoundError(uri.href);

			return {
				contents: [
					{
						mimeType: 'application/schema+json',
						text: JSON.stringify(schema),
						uri: uri.href
					}
				]
			};
		}
	);
}
