import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	sectionOutput,
	updateSectionInput,
	updateSectionToolName,
	type SectionOutput,
	type UpdateSectionInput
} from '$lib/server/mcp/contracts/sections';
import { McpUpdateError } from '$lib/server/mcp/update';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface UpdateSectionDependencies {
	updateSection(auth: McpAuth, input: UpdateSectionInput): Promise<SectionOutput>;
}

export function registerUpdateSectionTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: UpdateSectionDependencies
) {
	server.registerTool(
		updateSectionToolName,
		{
			annotations: {
				idempotentHint: false,
				openWorldHint: false,
				readOnlyHint: false
			},
			description:
				'Change a section that shows data related to its parent, as added with add_section: its background color, its visibility, and the measurement and objectType of a progress section. Pass the revision from the latest add_section, update_section or get_container response as expectedRevision. Settings you omit stay as they are. The type and the parent of a section, and the resourceDataType of a resource_data_collection, cannot change.',
			inputSchema: updateSectionInput,
			outputSchema: sectionOutput,
			title: 'Update section'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.updateSection(authorization.auth, input);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpUpdateError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to update a section through MCP'
				);
				return toolError('Unable to update section.');
			}
		}
	);
}
