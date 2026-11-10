import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	createContainersInput,
	createContainersOutput,
	createContainersToolName,
	maxContainersPerCall,
	type CreateContainersInput,
	type CreateContainersOutput
} from '$lib/server/mcp/contracts/creation';
import { McpCreationError } from '$lib/server/mcp/creation';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface CreateContainersDependencies {
	createContainers(auth: McpAuth, input: CreateContainersInput): Promise<CreateContainersOutput>;
}

export function registerCreateContainersTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: CreateContainersDependencies
) {
	server.registerTool(
		createContainersToolName,
		{
			annotations: {
				idempotentHint: false,
				openWorldHint: false,
				readOnlyHint: false
			},
			description: `Create up to ${maxContainersPerCall} containers of one organization in one transaction: either all of them or none. You choose the GUID of each new container, so that the containers of a call can refer to each other; a call repeated with the same GUIDs fails instead of creating duplicates. Each container follows the rules of create_container: read knotdots://schemas/payloads/{type} first, and look up category values with list_container_categories and list_container_category_values. Parent relations may point to existing containers or to containers listed earlier in the call. A container gets its permissions from its parents other than a category, so at least one of them must exist already: a new measure can be part of an existing program and of a goal created earlier in the call, whereas the goals of a new program need a second call. A term gets its permissions from its organization, so a new category and its terms take one call, and the terms below them a second one. Relations add semantic relations from a new container to existing containers or other containers of the call. To measure an existing measure with a new indicator, create the indicator and an effect that is part of the measure and is-measured-by the indicator. If a container fails, the error names it by its index.`,
			inputSchema: createContainersInput,
			outputSchema: createContainersOutput,
			title: 'Create containers'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.createContainers(authorization.auth, input);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpCreationError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to create containers through MCP'
				);
				return toolError('Unable to create containers.');
			}
		}
	);
}
