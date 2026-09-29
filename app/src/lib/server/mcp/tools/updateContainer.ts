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
				'Change payload fields of a non-template container. Pass the revision from the latest get_container, create_container or update_container response as expectedRevision; see knotdots://schemas/payloads/{type} for the fields. Relations, ownership and the payload type cannot be changed. aiContribution is set by the server: content changed through this tool is at least AI-assisted (0.5), AI-generated content stays at 1. Category values: category keys come from list_container_categories and values from list_container_category_values; use the value, not the label. Each value is chosen on its own, as in the web application: a sub-value neither requires nor implies its parent value. Unknown keys and values are rejected. Category values that are already stored are kept even if the organization no longer offers them.',
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
