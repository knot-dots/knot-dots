import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import {
	createPageInput,
	createPageOutput,
	type CreatePageInput,
	type CreatePageOutput
} from '$lib/server/mcp/contracts/creation';
import { McpCreationError } from '$lib/server/mcp/creation';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface CreatePageDependencies {
	createPage(userId: string, input: CreatePageInput): Promise<CreatePageOutput>;
}

export function registerCreatePageTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: CreatePageDependencies
) {
	server.registerTool(
		'create_page',
		{
			annotations: {
				idempotentHint: false,
				openWorldHint: false,
				readOnlyHint: false
			},
			description: 'Create a page in an organization or organizational unit.',
			inputSchema: createPageInput,
			outputSchema: createPageOutput,
			title: 'Create page'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.createPage(authorization.auth.userId, input);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpCreationError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to create a page through MCP'
				);
				return toolError('Unable to create page.');
			}
		}
	);
}
