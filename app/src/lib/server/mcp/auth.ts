import {
	OAuthError,
	OAuthErrorCode,
	type AuthInfo,
	type OAuthTokenVerifier
} from '@modelcontextprotocol/server';
import type { JWTVerifyGetKey } from 'jose';
import type { DatabasePool } from 'slonik';
import { z } from 'zod';
import { authenticateMcpToken } from '$lib/server/db';
import { getKeycloakJwks, verifyKeycloakAccessToken } from '$lib/server/mcp/keycloakTokens';
import { mcpResourceUrl } from '$lib/server/mcp/oauth';
import { hashMcpToken } from '$lib/server/mcp/tokens';

const tokenPrefix = 'mcp_pat_';
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

async function verifyPersonalAccessToken(pool: DatabasePool, token: string): Promise<AuthInfo> {
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
		// Personal access tokens are valid for this server only.
		resource: mcpResourceUrl(),
		scopes: authenticatedToken.scopes,
		token
	};
}

// Accepts personal access tokens and OAuth access tokens issued by Keycloak.
// Personal access tokens are recognizable by their prefix; everything else
// has to be a Keycloak access token.
export function createMcpTokenVerifier(
	pool: DatabasePool,
	{ jwks = getKeycloakJwks }: { jwks?: () => JWTVerifyGetKey } = {}
): OAuthTokenVerifier {
	return {
		verifyAccessToken(token: string) {
			return token.startsWith(tokenPrefix)
				? verifyPersonalAccessToken(pool, token)
				: verifyKeycloakAccessToken(token, jwks());
		}
	};
}
