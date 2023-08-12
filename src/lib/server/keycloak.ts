import { z } from 'zod';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';

const data = new URLSearchParams([['grant_type', 'client_credentials']]);
const credentials = btoa(
	`${privateEnv.KC_SERVICE_ACCOUNT_CLIENT_ID}:${privateEnv.KC_SERVICE_ACCOUNT_CLIENT_SECRET}`
);

async function getToken() {
	const response = await fetch(
		`${privateEnv.KC_URL}/realms/${env.PUBLIC_KC_REALM}/protocol/openid-connect/token`,
		{
			body: data,
			headers: { Authorization: `Basic ${credentials}` },
			method: 'POST'
		}
	);
	if (!response.ok) {
		throw new Error('Failed to obtain token for service account.');
	}
	return z.object({ access_token: z.string() }).parse(await response.json()).access_token;
}

export async function createOrganization(name: string) {
	const token = await getToken();
	const response = await fetch(`${privateEnv.KC_URL}/admin/realms/${env.PUBLIC_KC_REALM}/groups`, {
		body: JSON.stringify({ name }),
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		method: 'POST'
	});
	if (!response.ok) {
		throw new Error(
			`Failed to create organization in realm. Keycloak responded with ${response.status}`
		);
	}
	return z
		.string()
		.uuid()
		.parse(response.headers.get('Location')?.split('/').pop());
}
