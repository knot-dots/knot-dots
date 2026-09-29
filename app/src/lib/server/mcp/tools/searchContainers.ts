import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import {
	searchContainersInput,
	searchContainersOutput,
	type SearchContainersInput,
	type SearchContainersOutput
} from '$lib/server/mcp/contracts/containers';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface SearchContainersDependencies {
	searchContainers(userId: string, input: SearchContainersInput): Promise<SearchContainersOutput>;
}

export function registerSearchContainersTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: SearchContainersDependencies
) {
	server.registerTool(
		'search_containers',
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: true
			},
			description:
				'Search non-template containers visible to the authenticated user within an organization.',
			inputSchema: searchContainersInput,
			outputSchema: searchContainersOutput,
			title: 'Search containers'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersRead);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const output = await dependencies.searchContainers(authorization.auth.userId, input);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to search containers through MCP'
				);
				return toolError('Unable to search containers.');
			}
		}
	);
}
