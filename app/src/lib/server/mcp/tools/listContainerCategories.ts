import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import {
	listContainerCategoriesInput,
	listContainerCategoriesOutput,
	type ListContainerCategoriesInput,
	type ListContainerCategoriesOutput
} from '$lib/server/mcp/contracts/categories';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface ListContainerCategoriesDependencies {
	listContainerCategories(
		userId: string,
		input: ListContainerCategoriesInput
	): Promise<ListContainerCategoriesOutput>;
}

export function registerListContainerCategoriesTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: ListContainerCategoriesDependencies
) {
	server.registerTool(
		'list_container_categories',
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: true
			},
			description:
				'List category metadata available for container types in an organization. Use list_container_category_values to retrieve bounded value pages.',
			inputSchema: listContainerCategoriesInput,
			outputSchema: listContainerCategoriesOutput,
			title: 'List container categories'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersRead);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.listContainerCategories(authorization.auth.userId, input);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to list container categories through MCP'
				);
				return toolError('Unable to list container categories.');
			}
		}
	);
}
