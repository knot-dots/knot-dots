import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { McpCategoryError } from '$lib/server/mcp/categories';
import {
	listContainerCategoryValuesInput,
	listContainerCategoryValuesOutput,
	type ListContainerCategoryValuesInput,
	type ListContainerCategoryValuesOutput
} from '$lib/server/mcp/contracts/categories';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface ListContainerCategoryValuesDependencies {
	listContainerCategoryValues(
		userId: string,
		input: ListContainerCategoryValuesInput
	): Promise<ListContainerCategoryValuesOutput>;
}

export function registerListContainerCategoryValuesTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: ListContainerCategoryValuesDependencies
) {
	server.registerTool(
		'list_container_category_values',
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: true
			},
			description:
				'List a bounded page of stable values for one category returned by list_container_categories.',
			inputSchema: listContainerCategoryValuesInput,
			outputSchema: listContainerCategoryValuesOutput,
			title: 'List container category values'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersRead);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.listContainerCategoryValues(
					authorization.auth.userId,
					input
				);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpCategoryError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to list container category values through MCP'
				);
				return toolError('Unable to list container category values.');
			}
		}
	);
}
