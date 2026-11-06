import { createHash, randomBytes } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ suiteId: 'mcp-oauth' });

const clientId = 'knot-dots-mcp';
// MCP clients on the user's machine receive the authorization code on a
// loopback port of their choice; Keycloak accepts any port there.
const redirectUri = 'http://127.0.0.1:43210/callback';

// Follows the discovery an MCP client performs after its first, unauthenticated
// request: the challenge names the protected resource metadata, which names
// the authorization server.
async function discover(request: APIRequestContext) {
	const unauthenticated = await request.post('/mcp', { data: {} });
	expect(unauthenticated.status()).toBe(401);

	const challenge = unauthenticated.headers()['www-authenticate'];
	const metadataUrl = challenge.match(/resource_metadata="([^"]+)"/)?.[1];
	const scope = challenge.match(/scope="([^"]+)"/)?.[1];
	expect(metadataUrl).toBeDefined();
	expect(scope).toBeDefined();
	const metadata = await (await request.get(metadataUrl!)).json();
	const [issuer] = metadata.authorization_servers;
	const authorizationServer = await (
		await request.get(`${issuer}/.well-known/openid-configuration`)
	).json();

	return { authorizationServer, metadata, scope: scope! };
}

test.describe('MCP over OAuth', () => {
	test('advertises Keycloak as the authorization server', async ({ baseURL, request }) => {
		const { authorizationServer, metadata, scope } = await discover(request);

		// Resolving member names is not part of a connection by default.
		expect(scope).toBe('containers:read containers:write organizations:read');
		expect(metadata).toMatchObject({
			resource: `${baseURL}/mcp`,
			scopes_supported: ['containers:read', 'containers:write', 'organizations:read']
		});
		expect(authorizationServer.code_challenge_methods_supported).toContain('S256');
	});

	test('connects a client after the user signs in and consents', async ({ page, request }) => {
		const { authorizationServer, metadata, scope } = await discover(request);
		const verifier = randomBytes(32).toString('base64url');
		const authorize = new URL(authorizationServer.authorization_endpoint);
		authorize.search = new URLSearchParams({
			client_id: clientId,
			code_challenge: createHash('sha256').update(verifier).digest('base64url'),
			code_challenge_method: 'S256',
			redirect_uri: redirectUri,
			resource: metadata.resource,
			response_type: 'code',
			scope,
			state: randomBytes(16).toString('base64url')
		}).toString();

		// Nothing listens on the loopback port; the request carries the code.
		const callback = page.waitForRequest((r) => r.url().startsWith(redirectUri));
		await page.goto(authorize.href);
		await page.getByRole('textbox', { name: 'Email' }).fill('admin@knotdots.net');
		await page.getByRole('textbox', { name: 'Password' }).fill('test');
		await page.getByRole('button', { name: 'Sign In' }).click();

		// Keycloak asks for consent once and remembers it for later sign-ins.
		const consent = page.getByRole('button', { name: 'Yes' });
		const asksForConsent = await Promise.race([
			callback.then(() => false),
			consent.waitFor().then(
				() => true,
				() => false
			)
		]);
		if (asksForConsent) {
			await expect(page.getByText('Create and change content')).toBeVisible();
			await consent.click();
		}
		const code = new URL((await callback).url()).searchParams.get('code');
		expect(code).toBeTruthy();

		const tokenResponse = await request.post(authorizationServer.token_endpoint, {
			form: {
				client_id: clientId,
				code: code!,
				code_verifier: verifier,
				grant_type: 'authorization_code',
				redirect_uri: redirectUri,
				resource: metadata.resource
			}
		});
		expect(tokenResponse.ok()).toBe(true);
		const { access_token: accessToken, refresh_token: refreshToken } = await tokenResponse.json();
		expect(refreshToken).toBeTruthy();

		const response = await request.post('/mcp', {
			data: {
				id: 1,
				jsonrpc: '2.0',
				method: 'initialize',
				params: {
					capabilities: {},
					clientInfo: { name: 'e2e', version: '0' },
					protocolVersion: '2025-06-18'
				}
			},
			headers: {
				Accept: 'application/json, text/event-stream',
				Authorization: `Bearer ${accessToken}`
			}
		});
		expect(response.status()).toBe(200);
		expect(await response.text()).toContain('"serverInfo"');
	});
});
