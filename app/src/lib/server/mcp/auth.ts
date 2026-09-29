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

export const mcpAuthExtra = z.strictObject({
	tokenId: z.uuid(),
	userId: z.uuid()
});

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
