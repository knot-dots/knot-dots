import {
	getOAuthProtectedResourceMetadataUrl,
	type OAuthProtectedResourceMetadata
} from '@modelcontextprotocol/server';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
import { mcpConnectScopes } from '$lib/server/mcp/scopes';

// The URL under which MCP clients reach this server. OAuth access tokens must
// name it as their audience (RFC 8707); personal access tokens are bound to it
// implicitly.
export const mcpResourceUrl = () => new URL('/mcp', env.PUBLIC_BASE_URL);

// Where clients learn which authorization server issues tokens for this server
// (RFC 9728). Every 401 from /mcp points there.
export const mcpResourceMetadataUrl = () => getOAuthProtectedResourceMetadataUrl(mcpResourceUrl());

// MCP clients obtain OAuth access tokens from the Keycloak realm that also
// signs users in to the web application. This is where the application itself
// reaches the realm, for instance to fetch its signing keys.
export const keycloakIssuer = () => `${env.PUBLIC_KC_URL}/realms/${env.PUBLIC_KC_REALM}`;

// Where MCP clients reach the realm. Keycloak names the URL a token was
// requested at as its issuer, so tokens are verified against this one. It
// differs only locally: MCP clients send token requests over plain HTTP to
// loopback hosts only, while the application reaches Keycloak by its
// container name.
export const mcpAuthorizationServer = () =>
	privateEnv.KC_MCP_URL
		? `${privateEnv.KC_MCP_URL}/realms/${env.PUBLIC_KC_REALM}`
		: keycloakIssuer();

export function protectedResourceMetadata(): OAuthProtectedResourceMetadata {
	return {
		authorization_servers: [mcpAuthorizationServer()],
		bearer_methods_supported: ['header'],
		resource: mcpResourceUrl().href,
		resource_name: 'knot-dots',
		// Clients that ignore the scopes of the 401 challenge fall back to these,
		// so users:read is left out here, too: it is requested on demand.
		scopes_supported: mcpConnectScopes
	};
}
