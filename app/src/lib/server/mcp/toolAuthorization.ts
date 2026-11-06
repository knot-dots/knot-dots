import type { AuthInfo, ScopeChallengeHandler } from '@modelcontextprotocol/server';
import { mcpAuthExtra } from '$lib/server/mcp/auth';
import { mcpConnectScopes, type McpScope } from '$lib/server/mcp/scopes';

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

// An OAuth client that lacks a scope is answered with 403 insufficient_scope,
// which makes it authorize again and ask the user for the scopes named here:
// the ones it has, the ones every connection gets, and the missing one.
// Personal access tokens cannot gain scopes, so for them a missing scope stays
// the tool error of authorizeMcpTool.
export function oauthScopeChallenge(requiredScope: McpScope): ScopeChallengeHandler {
	return ({ authInfo }) => {
		const auth = mcpAuthExtra.safeParse(authInfo?.extra);
		if (
			!authInfo ||
			!auth.success ||
			auth.data.clientId === undefined ||
			authInfo.scopes.includes(requiredScope)
		) {
			return undefined;
		}

		const [first, ...rest] = new Set([...mcpConnectScopes, ...authInfo.scopes, requiredScope]);
		return {
			errorDescription: `This tool needs the scope ${requiredScope}`,
			scopes: [first, ...rest]
		};
	};
}
