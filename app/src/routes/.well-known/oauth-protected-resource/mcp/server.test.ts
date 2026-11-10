import { expect, test } from 'vitest';
import { mcpAuthorizationServer, mcpResourceUrl } from '$lib/server/mcp/oauth';
import { GET, OPTIONS } from './+server';

function get(features = ['McpServer']) {
	return GET({ locals: { features } } as never);
}

test('names Keycloak as the authorization server for /mcp', async () => {
	const response = await get();

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toEqual({
		authorization_servers: [mcpAuthorizationServer()],
		bearer_methods_supported: ['header'],
		resource: mcpResourceUrl().href,
		resource_name: 'knot-dots',
		scopes_supported: ['containers:read', 'containers:write', 'organizations:read']
	});
});

test('can be read cross-origin', async () => {
	const response = await get();
	const preflight = await OPTIONS({} as never);

	expect(response.headers.get('access-control-allow-origin')).toBe('*');
	expect(preflight.status).toBe(204);
	expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
});

test('does not answer unless the deployment enables the MCP server', async () => {
	const response = await get(['MCP']);

	expect(response.status).toBe(404);
});
