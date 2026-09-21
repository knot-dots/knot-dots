import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { z } from 'zod';
import { organizationalUnitSummary } from '$lib/organizationalUnitSummary';
import type { ListMcpOrganizationalUnitsResult } from '$lib/server/mcp/organizationalUnits';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

const listOrganizationalUnitsInput = z.strictObject({
	limit: z.number().int().min(1).max(100).default(50),
	offset: z.number().int().nonnegative().default(0),
	organizationGuid: z.uuid()
});

export const listOrganizationalUnitsOutput = z.strictObject({
	nextOffset: z.number().int().nonnegative().nullable(),
	organizationalUnits: z.array(organizationalUnitSummary)
});

export interface ListOrganizationalUnitsDependencies {
	listOrganizationalUnits(
		userId: string,
		input: z.infer<typeof listOrganizationalUnitsInput>
	): Promise<ListMcpOrganizationalUnitsResult>;
}

export function registerListOrganizationalUnitsTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: ListOrganizationalUnitsDependencies
) {
	server.registerTool(
		'list_organizational_units',
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: true
			},
			description: 'List organizational units visible to the authenticated user.',
			inputSchema: listOrganizationalUnitsInput,
			outputSchema: listOrganizationalUnitsOutput,
			title: 'List organizational units'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.organizationsRead);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const output = await dependencies.listOrganizationalUnits(authorization.auth.userId, input);

				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to list organizational units through MCP'
				);
				return toolError('Unable to list organizational units.');
			}
		}
	);
}
