import { OAuthError, OAuthErrorCode, type AuthInfo } from '@modelcontextprotocol/server';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import { env } from '$env/dynamic/public';
import { keycloakIssuer, mcpAuthorizationServer, mcpResourceUrl } from '$lib/server/mcp/oauth';
import { mcpScopes, type McpScope } from '$lib/server/mcp/scopes';

let keycloakJwks: JWTVerifyGetKey | undefined;

// Keycloak's public signing keys. jose caches them and fetches them again when
// a token names a key it does not know yet, as happens after a key rotation.
// Shared across requests on purpose: the keys are the same for every user.
export function getKeycloakJwks(): JWTVerifyGetKey {
	keycloakJwks ??= createRemoteJWKSet(new URL(`${keycloakIssuer()}/protocol/openid-connect/certs`));
	return keycloakJwks;
}

// These failures mean the token itself is unacceptable. Anything else, such as
// Keycloak being unreachable while its keys are fetched, is an outage and must
// not look like bad credentials to the client.
const credentialErrors = [
	errors.JOSEAlgNotAllowed,
	errors.JOSENotSupported,
	errors.JWKSMultipleMatchingKeys,
	errors.JWKSNoMatchingKey,
	errors.JWSInvalid,
	errors.JWSSignatureVerificationFailed,
	errors.JWTClaimValidationFailed,
	errors.JWTExpired,
	errors.JWTInvalid
];

// Keycloak signs refresh and ID tokens with the same keys; typ tells them
// apart from access tokens. The subject is the guid of the user.
const accessTokenClaims = z.object({
	azp: z.string().min(1),
	exp: z.number(),
	scope: z.string().default(''),
	sub: z.uuid(),
	typ: z.literal('Bearer')
});

const supportedScopes = new Set<string>(Object.values(mcpScopes));

function isMcpScope(scope: string): scope is McpScope {
	return supportedScopes.has(scope);
}

function invalidToken(): OAuthError {
	return new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid access token');
}

export async function verifyKeycloakAccessToken(
	token: string,
	jwks: JWTVerifyGetKey
): Promise<AuthInfo> {
	let payload: unknown;
	try {
		({ payload } = await jwtVerify(token, jwks, {
			algorithms: ['RS256'],
			audience: mcpResourceUrl().href,
			issuer: mcpAuthorizationServer(),
			requiredClaims: ['exp', 'sub']
		}));
	} catch (error) {
		if (credentialErrors.some((credentialError) => error instanceof credentialError)) {
			throw invalidToken();
		}
		throw error;
	}

	const claims = accessTokenClaims.safeParse(payload);
	// Only the client registered for MCP may use its tokens here, even if
	// another client of the realm were given this server as an audience.
	if (!claims.success || claims.data.azp !== env.PUBLIC_KC_MCP_CLIENT_ID) {
		throw invalidToken();
	}

	return {
		clientId: claims.data.azp,
		expiresAt: claims.data.exp,
		extra: { clientId: claims.data.azp, userId: claims.data.sub },
		resource: mcpResourceUrl(),
		scopes: claims.data.scope.split(' ').filter(isMcpScope),
		token
	};
}
