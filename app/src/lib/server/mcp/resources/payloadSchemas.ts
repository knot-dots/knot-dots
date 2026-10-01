import {
	ResourceNotFoundError,
	ResourceTemplate,
	type McpServer
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getPayloadSchema } from '$lib/models';
import {
	mcpPayloadTypes,
	mcpPayloadTypeValues,
	type McpPayloadType
} from '$lib/server/mcp/contracts/payloads';

export const payloadSchemaCatalogUri = 'knotdots://schemas/payloads';

function payloadSchemaUri(payloadType: McpPayloadType) {
	return `${payloadSchemaCatalogUri}/${payloadType}`;
}

const catalog = {
	description:
		'Canonical payload validation schemas exposed through MCP. Schema availability does not imply that an MCP creation tool is available.',
	payloads: mcpPayloadTypeValues.map((type) => ({ type, uri: payloadSchemaUri(type) })),
	schemaVersion: 1
};

const jsonSchemas = new Map(
	mcpPayloadTypeValues.map(
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
				type: (value) => mcpPayloadTypeValues.filter((type) => type.startsWith(value))
			},
			list: undefined
		}),
		{
			description: 'JSON Schema for a canonical Knot Dots payload.',
			mimeType: 'application/schema+json',
			title: 'Payload schema'
		},
		(uri, variables) => {
			const parseResult = mcpPayloadTypes.safeParse(variables.type);
			if (!parseResult.success) {
				throw new ResourceNotFoundError(uri.href);
			}
			const payloadType = parseResult.data;
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
