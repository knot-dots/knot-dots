import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { z } from 'zod';
import { organizationMembership, type OrganizationMembership } from '$lib/organizationMembership';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export const listMyOrganizationsOutput = z.strictObject({
	organizations: z.array(organizationMembership)
});

export interface ListMyOrganizationsDependencies {
	listOrganizationMemberships(userId: string): Promise<OrganizationMembership[]>;
}

export function registerListMyOrganizationsTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: ListMyOrganizationsDependencies
) {
	server.registerTool(
		'list_my_organizations',
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: true
			},
			description:
				'List active organizations where the authenticated user is a member, including their membership role.',
			inputSchema: z.strictObject({}),
			outputSchema: listMyOrganizationsOutput,
			title: 'List my organizations'
		},
		async () => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.organizationsRead);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const output = {
					organizations: await dependencies.listOrganizationMemberships(authorization.auth.userId)
				};

				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to list organizations through MCP'
				);
				return toolError('Unable to list organizations.');
			}
		}
	);
}
