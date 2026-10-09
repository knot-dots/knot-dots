import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	setActualDataInput,
	setActualDataOutput,
	setActualDataToolName,
	type SetActualDataInput,
	type SetActualDataOutput
} from '$lib/server/mcp/contracts/actualData';
import { McpCreationError } from '$lib/server/mcp/creation';
import { McpActualDataError } from '$lib/server/mcp/actualData';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface SetActualDataDependencies {
	setActualData(auth: McpAuth, input: SetActualDataInput): Promise<SetActualDataOutput>;
}

export function registerSetActualDataTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: SetActualDataDependencies
) {
	server.registerTool(
		setActualDataToolName,
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: false
			},
			description:
				'Record the actual values of an indicator for an organization or organizational unit, as the indicator table of the web application does: values by year for an indicator template, booleanValue for a binary indicator. The values are kept in one actual-data record per indicator and organization or unit, which is created on the first call; given years replace their stored values and other years are kept. The response lists all values after the change. Planned or wanted values of a measure or goal belong to its effect or objective instead (see attach_indicator).',
			inputSchema: setActualDataInput,
			outputSchema: setActualDataOutput,
			title: 'Set actual data'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const output = await dependencies.setActualData(authorization.auth, input);

				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpActualDataError || error instanceof McpCreationError) {
					return toolError(error.message);
				}
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to set actual data through MCP'
				);
				return toolError('Unable to set the actual values.');
			}
		}
	);
}
