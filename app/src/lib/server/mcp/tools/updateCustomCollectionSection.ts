import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	customCollectionSectionOutput,
	updateCustomCollectionSectionInput,
	updateCustomCollectionSectionToolName,
	type CustomCollectionSectionOutput,
	type UpdateCustomCollectionSectionInput
} from '$lib/server/mcp/contracts/customCollections';
import { McpUpdateError } from '$lib/server/mcp/update';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface UpdateCustomCollectionSectionDependencies {
	updateCustomCollectionSection(
		auth: McpAuth,
		input: UpdateCustomCollectionSectionInput
	): Promise<CustomCollectionSectionOutput>;
}

export function registerUpdateCustomCollectionSectionTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: UpdateCustomCollectionSectionDependencies
) {
	server.registerTool(
		updateCustomCollectionSectionToolName,
		{
			annotations: {
				idempotentHint: false,
				openWorldHint: false,
				readOnlyHint: false
			},
			description:
				'Change an Embed objects section (custom collection). Pass the revision from the latest add_custom_collection_section, update_custom_collection_section or get_container response as expectedRevision. Settings you omit stay as they are. types, categories and items replace the current ones. Filter settings (types, categories, includeSubordinateOrganizationalUnits) make the collection follow its filter and clear its items; items make it show a fixed selection, and an empty items list makes it follow its filter again. Give either filter settings or items, not both; mode in the output tells which applies. includeSubordinateOrganizationalUnits replaces an organization scope chosen in the web application; other filters chosen there, such as status, are kept. Category keys come from list_container_categories and values from list_container_category_values; values that are already stored are kept even if the organization no longer offers them.',
			inputSchema: updateCustomCollectionSectionInput,
			outputSchema: customCollectionSectionOutput,
			title: 'Update custom collection section'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.updateCustomCollectionSection(authorization.auth, input);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpUpdateError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to update a custom collection section through MCP'
				);
				return toolError('Unable to update custom collection section.');
			}
		}
	);
}
