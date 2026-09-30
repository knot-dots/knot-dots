import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { AnyPayload, Container } from '$lib/models';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	updateContainerInput,
	updateContainerOutput,
	updateContainerToolName,
	type UpdateContainerInput
} from '$lib/server/mcp/contracts/update';
import { serializeMcpContainer } from '$lib/server/mcp/containers';
import { McpUpdateError } from '$lib/server/mcp/update';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface UpdateContainerDependencies {
	updateContainer(auth: McpAuth, input: UpdateContainerInput): Promise<Container<AnyPayload>>;
}

export function registerUpdateContainerTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: UpdateContainerDependencies
) {
	server.registerTool(
		updateContainerToolName,
		{
			annotations: {
				idempotentHint: false,
				openWorldHint: false,
				readOnlyHint: false
			},
			description:
				'Change payload fields of a non-template container. Read it with get_container first and pass its revision as expectedRevision; see knotdots://schemas/payloads/{type} for the fields. Relations, ownership and the payload type cannot be changed.',
			inputSchema: updateContainerInput,
			outputSchema: updateContainerOutput,
			title: 'Update container'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) return authorization.result;

			try {
				const container = await dependencies.updateContainer(authorization.auth, input);
				const output = serializeMcpContainer(container);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpUpdateError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to update a container through MCP'
				);
				return toolError('Unable to update container.');
			}
		}
	);
}
