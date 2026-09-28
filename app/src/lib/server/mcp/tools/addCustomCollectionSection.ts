import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import {
	addCustomCollectionSectionInput,
	addCustomCollectionSectionOutput,
	type AddCustomCollectionSectionInput,
	type AddCustomCollectionSectionOutput
} from '$lib/server/mcp/contracts/creation';
import { McpCreationError } from '$lib/server/mcp/creation';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface AddCustomCollectionSectionDependencies {
	addCustomCollectionSection(
		userId: string,
		input: AddCustomCollectionSectionInput
	): Promise<AddCustomCollectionSectionOutput>;
}

export function registerAddCustomCollectionSectionTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: AddCustomCollectionSectionDependencies
) {
	server.registerTool(
		'add_custom_collection_section',
		{
			annotations: {
				idempotentHint: false,
				openWorldHint: false,
				readOnlyHint: false
			},
			description: 'Append a dynamic Embed objects section to a page using discovered categories.',
			inputSchema: addCustomCollectionSectionInput,
			outputSchema: addCustomCollectionSectionOutput,
			title: 'Add custom collection section'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.addCustomCollectionSection(
					authorization.auth.userId,
					input
				);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpCreationError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to add a custom collection section through MCP'
				);
				return toolError('Unable to add custom collection section.');
			}
		}
	);
}
