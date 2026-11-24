import { OAuthErrorCode } from '@modelcontextprotocol/server';
import {
	createLocalJWKSet,
	exportJWK,
	generateKeyPair,
	SignJWT,
	type JWTPayload,
	type JWTVerifyGetKey
} from 'jose';
import { beforeAll, describe, expect, test } from 'vitest';
import { env } from '$env/dynamic/public';
import { verifyKeycloakAccessToken } from './keycloakTokens';
import { mcpAuthorizationServer, mcpResourceUrl } from './oauth';

const userId = '00000000-0000-4000-8000-000000000002';
const keyId = 'test-key';

type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

let privateKey: PrivateKey;
let otherPrivateKey: PrivateKey;
let jwks: JWTVerifyGetKey;

beforeAll(async () => {
	const keyPair = await generateKeyPair('RS256');
	privateKey = keyPair.privateKey;
	otherPrivateKey = (await generateKeyPair('RS256')).privateKey;
	jwks = createLocalJWKSet({
		keys: [{ ...(await exportJWK(keyPair.publicKey)), alg: 'RS256', kid: keyId }]
	});
});

function claims(overrides: JWTPayload = {}): JWTPayload {
	return {
		aud: [mcpResourceUrl().href, 'account'],
		azp: env.PUBLIC_KC_MCP_CLIENT_ID,
		exp: Math.floor(Date.now() / 1000) + 300,
		iat: Math.floor(Date.now() / 1000),
		iss: mcpAuthorizationServer(),
		scope: 'openid profile containers:read containers:write organizations:read',
		sub: userId,
		typ: 'Bearer',
		...overrides
	};
}

function sign(payload: JWTPayload, key: PrivateKey = privateKey) {
	return new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid: keyId }).sign(key);
}

describe('Keycloak access token verification', () => {
	test('returns SDK auth information for an access token of the MCP client', async () => {
		const payload = claims();
		const token = await sign(payload);

		await expect(verifyKeycloakAccessToken(token, jwks)).resolves.toEqual({
			clientId: env.PUBLIC_KC_MCP_CLIENT_ID,
			expiresAt: payload.exp,
			extra: { clientId: env.PUBLIC_KC_MCP_CLIENT_ID, userId },
			resource: mcpResourceUrl(),
			scopes: ['containers:read', 'containers:write', 'organizations:read'],
			token
		});
	});

	test.each([
		['another issuer', { iss: 'http://keycloak:8080/realms/other' }],
		['another audience', { aud: 'account' }],
		['another client', { azp: 'knot-dots' }],
		['a refresh token', { typ: 'Refresh' }],
		['an ID token', { typ: 'ID' }],
		['an expired token', { exp: Math.floor(Date.now() / 1000) - 60 }],
		['a subject that is no user guid', { sub: 'service-account' }]
	])('rejects %s', async (_, overrides) => {
		const token = await sign(claims(overrides));

		await expect(verifyKeycloakAccessToken(token, jwks)).rejects.toMatchObject({
			code: OAuthErrorCode.InvalidToken
		});
	});

	test('rejects a token signed with another key', async () => {
		const token = await sign(claims(), otherPrivateKey);

		await expect(verifyKeycloakAccessToken(token, jwks)).rejects.toMatchObject({
			code: OAuthErrorCode.InvalidToken
		});
	});

	test('rejects a symmetrically signed token', async () => {
		const token = await new SignJWT(claims())
			.setProtectedHeader({ alg: 'HS256', kid: keyId })
			.sign(new TextEncoder().encode('a shared secret of at least 32 bytes'));

		await expect(verifyKeycloakAccessToken(token, jwks)).rejects.toMatchObject({
			code: OAuthErrorCode.InvalidToken
		});
	});

	test('rejects an unsigned token', async () => {
		const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
		const payload = Buffer.from(JSON.stringify(claims())).toString('base64url');

		await expect(verifyKeycloakAccessToken(`${header}.${payload}.`, jwks)).rejects.toMatchObject({
			code: OAuthErrorCode.InvalidToken
		});
	});

	test('rejects something that is no token at all', async () => {
		await expect(verifyKeycloakAccessToken('not-a-token', jwks)).rejects.toMatchObject({
			code: OAuthErrorCode.InvalidToken
		});
	});

	test('does not turn an unreachable Keycloak into a credential failure', async () => {
		const outage = new TypeError('fetch failed');
		const token = await sign(claims());

		await expect(verifyKeycloakAccessToken(token, () => Promise.reject(outage))).rejects.toBe(
			outage
		);
	});
});
