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

export async function createGroup(name: string) {
	const token = await getToken();
	const response = await fetch(`${privateEnv.KC_URL}/admin/realms/${env.PUBLIC_KC_REALM}/groups`, {
		body: JSON.stringify({ name }),
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		method: 'POST'
	});
	if (!response.ok) {
		throw new Error(`Failed to create group in realm. Keycloak responded with ${response.status}`);
	}
	return z
		.string()
		.uuid()
		.parse(response.headers.get('Location')?.split('/').pop());
}

const client = z.intersection(
	z.record(z.string(), z.unknown()),
	z.object({
		id: z.string().uuid(),
		redirectUris: z.array(z.string()),
		webOrigins: z.array(z.string())
	})
);

type Client = z.infer<typeof client>;

function urlFromSlug(slug: string) {
	const url = new URL(env.PUBLIC_BASE_URL ?? '');
	url.hostname = `${slug}.${url.hostname}`;
	url.pathname = '/*';
	return url;
}

export async function updateAccessSettings(slug: string) {
	const token = await getToken();

	const getResponse = await fetch(
		`${privateEnv.KC_URL}/admin/realms/${env.PUBLIC_KC_REALM}/clients?clientId=${env.PUBLIC_KC_CLIENT_ID}`,
		{
			headers: {
				Authorization: `Bearer ${token}`
			}
		}
	);
	if (!getResponse.ok) {
		throw new Error(
			`Failed to fetch representation of client ${env.PUBLIC_KC_CLIENT_ID} in realm. Keycloak responded with ${getResponse.status}`
		);
	}

	const data: Client[] = z.array(client).parse(await getResponse.json());
	if (data.length == 0) {
		throw new Error(
			`Failed to fetch representation of client ${env.PUBLIC_KC_CLIENT_ID} in realm. Wrong client id`
		);
	}

	data[0].webOrigins.push(urlFromSlug(slug).origin);
	data[0].redirectUris.push(urlFromSlug(slug).href);

	const putResponse = await fetch(
		`${privateEnv.KC_URL}/admin/realms/${env.PUBLIC_KC_REALM}/clients/${data[0].id}`,
		{
			body: JSON.stringify(data[0]),
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			method: 'PUT'
		}
	);
	if (!putResponse.ok) {
		throw new Error(
			`Failed to update settings of client ${env.PUBLIC_KC_CLIENT_ID} in realm. Keycloak responded with ${putResponse.status}`
		);
	}
}
