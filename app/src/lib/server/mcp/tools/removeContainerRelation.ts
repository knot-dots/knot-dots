import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	removeContainerRelationToolName,
	containerRelationChangeInput,
	containerRelationChangeOutput,
	type ContainerRelationChangeInput,
	type ContainerRelationChangeOutput
} from '$lib/server/mcp/contracts/relations';
import { McpRelationError } from '$lib/server/mcp/relations';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface RemoveContainerRelationDependencies {
	removeContainerRelation(
		auth: McpAuth,
		input: ContainerRelationChangeInput
	): Promise<ContainerRelationChangeOutput>;
}

export function registerRemoveContainerRelationTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: RemoveContainerRelationDependencies
) {
	server.registerTool(
		removeContainerRelationToolName,
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: false
			},
			description:
				'Remove a semantic relation between two containers. Symmetric relations are removed in whichever direction they are stored. Update permission on either container is required. Removing a relation that does not exist changes nothing.',
			inputSchema: containerRelationChangeInput,
			outputSchema: containerRelationChangeOutput,
			title: 'Remove container relation'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const output = await dependencies.removeContainerRelation(authorization.auth, input);

				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpRelationError) {
					return toolError(error.message);
				}
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to remove a container relation through MCP'
				);
				return toolError('Unable to remove the relation.');
			}
		}
	);
}
