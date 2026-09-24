import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { AnyPayload, Container } from '$lib/models';
import { getContainerInput, getContainerOutput } from '$lib/server/mcp/contracts/containers';
import { serializeMcpContainer } from '$lib/server/mcp/containers';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface GetContainerDependencies {
	getContainer(userId: string, guid: string): Promise<Container<AnyPayload> | null>;
}

export function registerGetContainerTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: GetContainerDependencies
) {
	server.registerTool(
		'get_container',
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: true
			},
			description: 'Get one complete container when it is visible to the authenticated user.',
			inputSchema: getContainerInput,
			outputSchema: getContainerOutput,
			title: 'Get container'
		},
		async ({ guid }) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersRead);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const container = await dependencies.getContainer(authorization.auth.userId, guid);
				if (!container) {
					return toolError('Container not found.');
				}

				const output = serializeMcpContainer(container);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to get a container through MCP'
				);
				return toolError('Unable to get container.');
			}
		}
	);
}
