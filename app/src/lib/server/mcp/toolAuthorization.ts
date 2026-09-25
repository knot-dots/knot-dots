import type { AuthInfo } from '@modelcontextprotocol/server';
import { mcpAuthExtra } from '$lib/server/mcp/auth';
import type { McpScope } from '$lib/server/mcp/scopes';

export function toolError(message: string) {
	return {
		content: [{ type: 'text' as const, text: message }],
		isError: true
	};
}

export function authorizeMcpTool(authInfo: AuthInfo | undefined, requiredScope: McpScope) {
	if (!authInfo?.scopes.includes(requiredScope)) {
		return {
			result: toolError(`Missing required scope: ${requiredScope}`),
			success: false as const
		};
	}

	const parsedAuthExtra = mcpAuthExtra.safeParse(authInfo.extra);
	if (!parsedAuthExtra.success) {
		return {
			result: toolError('Invalid authentication context.'),
			success: false as const
		};
	}

	return { auth: parsedAuthExtra.data, success: true as const };
}
