import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import type { McpAuth } from '$lib/server/mcp/auth';
import {
	attachIndicatorInput,
	attachIndicatorOutput,
	attachIndicatorToolName,
	type AttachIndicatorInput,
	type AttachIndicatorOutput
} from '$lib/server/mcp/contracts/indicators';
import { McpCreationError } from '$lib/server/mcp/creation';
import { McpIndicatorError } from '$lib/server/mcp/indicators';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { authorizeMcpTool, toolError } from '$lib/server/mcp/toolAuthorization';

export interface AttachIndicatorDependencies {
	attachIndicator(auth: McpAuth, input: AttachIndicatorInput): Promise<AttachIndicatorOutput>;
}

export function registerAttachIndicatorTool(
	server: McpServer,
	authInfo: AuthInfo | undefined,
	dependencies: AttachIndicatorDependencies
) {
	server.registerTool(
		attachIndicatorToolName,
		{
			annotations: {
				idempotentHint: true,
				openWorldHint: false,
				readOnlyHint: false
			},
			description:
				'Measure the progress of a measure, simple measure or goal with an indicator, as in the web application. Indicators are never related to measures or goals directly: this creates an effect (for measures) or an objective (for goals) that is part of the target and points to the indicator; planned, achieved or wanted values are kept on that effect or objective. Any indicator visible to you can be used, including public templates of other organizations. Attaching an indicator that is already attached changes nothing.',
			inputSchema: attachIndicatorInput,
			outputSchema: attachIndicatorOutput,
			title: 'Attach indicator'
		},
		async (input) => {
			const authorization = authorizeMcpTool(authInfo, mcpScopes.containersWrite);
			if (!authorization.success) {
				return authorization.result;
			}

			try {
				const output = await dependencies.attachIndicator(authorization.auth, input);

				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output
				};
			} catch (error) {
				if (error instanceof McpIndicatorError || error instanceof McpCreationError) {
					return toolError(error.message);
				}
				log.error(
					isErrorLike(error) ? { error: serializeError(error) } : {},
					'Failed to attach an indicator through MCP'
				);
				return toolError('Unable to attach the indicator.');
			}
		}
	);
}
