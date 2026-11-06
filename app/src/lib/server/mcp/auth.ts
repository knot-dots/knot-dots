import {
	OAuthError,
	OAuthErrorCode,
	type AuthInfo,
	type OAuthTokenVerifier
} from '@modelcontextprotocol/server';
import type { DatabasePool } from 'slonik';
import { z } from 'zod';
import { authenticateMcpToken } from '$lib/server/db';
import { hashMcpToken } from '$lib/server/mcp/tokens';

const tokenPattern = /^mcp_pat_[A-Za-z0-9_-]{43}$/;

// Exactly one of tokenId and clientId says how a request was authenticated:
// tokenId names a personal access token, clientId the OAuth client that
// Keycloak issued the access token to.
export const mcpAuthExtra = z
	.strictObject({
		clientId: z.string().min(1).optional(),
		tokenId: z.uuid().optional(),
		userId: z.uuid()
	})
	.refine(({ clientId, tokenId }) => (clientId === undefined) !== (tokenId === undefined));

export type McpAuth = z.infer<typeof mcpAuthExtra>;

function invalidToken(): OAuthError {
	return new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid access token');
}

export function createMcpTokenVerifier(pool: DatabasePool): OAuthTokenVerifier {
	return {
		async verifyAccessToken(token: string): Promise<AuthInfo> {
			if (!tokenPattern.test(token)) {
				throw invalidToken();
			}

			const authenticatedToken = await pool.connect(authenticateMcpToken(hashMcpToken(token)));
			if (!authenticatedToken) {
				throw invalidToken();
			}

			return {
				clientId: authenticatedToken.id,
				expiresAt: Math.floor(authenticatedToken.expires_at.getTime() / 1000),
				extra: {
					tokenId: authenticatedToken.id,
					userId: authenticatedToken.user_id
				},
				scopes: authenticatedToken.scopes,
				token
			};
		}
	};
}
