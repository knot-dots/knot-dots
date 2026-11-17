import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	addSectionInput,
	addSectionToolName,
	dataViewSectionParentTypes,
	type AddSectionInput,
	sectionOutput,
	type SectionOutput
} from '$lib/server/mcp/contracts/sections';
import { McpCreationError } from '$lib/server/mcp/creation';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface AddSectionDependencies {
	addSection(auth: McpAuth, input: AddSectionInput): Promise<SectionOutput>;
}

const parentsPerType = Object.entries(dataViewSectionParentTypes)
	.map(([type, parentTypes]) => `${type} (${parentTypes.join(', ')})`)
	.join('; ');

export function registerAddSectionTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: AddSectionDependencies
) {
	server.registerTool(
		addSectionToolName,
		{
			annotations: {
				idempotentHint: false,
				openWorldHint: false,
				readOnlyHint: false
			},
			description: `Append a section that shows data related to its parent, such as the goals of a measure, its tasks or its progress, after the existing sections of the parent; a section of an organizational unit belongs to that unit. The server sets the title. Types and the parents they fit: ${parentsPerType}. A parent takes one section of each type, and one resource_data_collection per resourceDataType. Some sections need more: an indicator_collection the indicators workspace among the visible workspaces of the organization or unit (an empty list shows all), a demographic_data section an organizational unit with a geometry, an objective_collection a goal that is not part of a measure, and an effect_collection on a goal a goal that is part of a measure. A resource_data_collection needs resource planning (the ResourceV2 feature), and a resource_collection is only available without it. Change the section later with update_section, passing the returned revision. Add text sections with create_container and embedded objects with add_custom_collection_section.`,
			inputSchema: addSectionInput,
			outputSchema: sectionOutput,
			title: 'Add section'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.addSection(authorization.auth, input);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpCreationError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to add a section through MCP'
				);
				return toolError('Unable to add section.');
			}
		}
	);
}
