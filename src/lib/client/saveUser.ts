import type Keycloak from 'keycloak-js';
import type { NewUser } from '$lib/models';
import { newUser } from '$lib/models';

export default async function saveUser(keycloak: Keycloak, user: NewUser) {
	// Ensure a fresh token will be included in the Authorization header.
	await keycloak.updateToken(-1).catch(() => null);

	return await fetch('/user', {
		method: 'POST',
		body: JSON.stringify(newUser.parse(user)),
		headers: {
			Authorization: `Bearer ${keycloak.token}`,
			'Content-Type': 'application/json'
		}
	});
}
