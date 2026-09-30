import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import {
	searchOrganizationUsersInput,
	searchOrganizationUsersOutput,
	type SearchOrganizationUsersInput,
	type SearchOrganizationUsersOutput
} from '$lib/server/mcp/contracts/users';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';
import { McpUserError } from '$lib/server/mcp/users';

export interface SearchOrganizationUsersDependencies {
	searchOrganizationUsers(
		userId: string,
		input: SearchOrganizationUsersInput
	): Promise<SearchOrganizationUsersOutput>;
}

export function registerSearchOrganizationUsersTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: SearchOrganizationUsersDependencies
) {
	server.registerTool(
		'search_organization_users',
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: true
			},
			description:
				'Search organization members by display name. Returns only display names and GUIDs; use the GUIDs with assignee filters.',
			inputSchema: searchOrganizationUsersInput,
			outputSchema: searchOrganizationUsersOutput,
			title: 'Search organization users'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.usersRead);
			if (!authorization.success) return authorization.result;

			try {
				const output = await dependencies.searchOrganizationUsers(authorization.auth.userId, input);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpUserError) return toolError(error.message);
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to search organization users through MCP'
				);
				return toolError('Unable to search organization users.');
			}
		}
	);
}
