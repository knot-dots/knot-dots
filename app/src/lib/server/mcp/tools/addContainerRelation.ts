import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	addContainerRelationToolName,
	containerRelationChangeInput,
	containerRelationChangeOutput,
	type ContainerRelationChangeInput,
	type ContainerRelationChangeOutput
} from '$lib/server/mcp/contracts/relations';
import { McpRelationError } from '$lib/server/mcp/relations';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface AddContainerRelationDependencies {
	addContainerRelation(
		auth: McpAuth,
		input: ContainerRelationChangeInput
	): Promise<ContainerRelationChangeOutput>;
}

export function registerAddContainerRelationTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: AddContainerRelationDependencies
) {
	server.registerTool(
		addContainerRelationToolName,
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: false
			},
			description:
				'Relate two existing containers of the same organization with a semantic relation, like the relation overlay of the web application. Structural relations such as is-part-of cannot be changed. Update permission on either container is required. Adding an existing relation changes nothing. Call list_container_relations to see existing relations.',
			inputSchema: containerRelationChangeInput,
			outputSchema: containerRelationChangeOutput,
			title: 'Add container relation'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const output = await dependencies.addContainerRelation(authorization.auth, input);

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
					'Failed to add a container relation through MCP'
				);
				return toolError('Unable to add the relation.');
			}
		}
	);
}
