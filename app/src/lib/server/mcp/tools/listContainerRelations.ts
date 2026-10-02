import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import {
	listContainerRelationsInput,
	listContainerRelationsOutput,
	type ListContainerRelationsInput,
	type ListContainerRelationsOutput
} from '$lib/server/mcp/contracts/relations';
import { McpRelationError } from '$lib/server/mcp/relations';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface ListContainerRelationsDependencies {
	listContainerRelations(
		userId: string,
		input: ListContainerRelationsInput
	): Promise<ListContainerRelationsOutput>;
}

export function registerListContainerRelationsTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: ListContainerRelationsDependencies
) {
	server.registerTool(
		'list_container_relations',
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: true
			},
			description:
				'List the direct relations of a container visible to the authenticated user, with a summary of the related container. A relation reads as "subject predicate object"; direction tells which side the listed container is on. Relations to containers you may not read are left out.',
			inputSchema: listContainerRelationsInput,
			outputSchema: listContainerRelationsOutput,
			title: 'List container relations'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersRead);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const output = await dependencies.listContainerRelations(authorization.auth.userId, input);

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
					'Failed to list container relations through MCP'
				);
				return toolError('Unable to list container relations.');
			}
		}
	);
}
