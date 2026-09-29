import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { AnyPayload, Container } from '$lib/models';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	createContainerInput,
	createContainerOutput,
	createContainerToolName,
	type CreateContainerInput
} from '$lib/server/mcp/contracts/creation';
import { serializeMcpContainer } from '$lib/server/mcp/containers';
import { McpCreationError } from '$lib/server/mcp/creation';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface CreateContainerDependencies {
	createContainer(auth: McpAuth, input: CreateContainerInput): Promise<Container<AnyPayload>>;
}

export function registerCreateContainerTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: CreateContainerDependencies
) {
	server.registerTool(
		createContainerToolName,
		{
			annotations: {
				idempotentHint: false,
				openWorldHint: false,
				readOnlyHint: false
			},
			description:
				'Create a non-template container. Read knotdots://schemas/payloads/{type} before supplying the complete payload. Parents must be visible to you and belong to the same organization; create permission is checked for the new container itself, not for its parents. The container is appended after the existing children of each parent. A measure created below a measure gets the hierarchy level below its parent. The container is marked as AI-generated (aiContribution 1). Category values: category keys come from list_container_categories and values from list_container_category_values; use the value, not the label. Each value is chosen on its own, as in the web application: a sub-value neither requires nor implies its parent value. Unknown keys and values are rejected.',
			inputSchema: createContainerInput,
			outputSchema: createContainerOutput,
			title: 'Create container'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) return authorization.result;

			try {
				const container = await dependencies.createContainer(authorization.auth, input);
				const output = serializeMcpContainer(container);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpCreationError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to create a container through MCP'
				);
				return toolError('Unable to create container.');
			}
		}
	);
}
