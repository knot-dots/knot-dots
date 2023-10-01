import type Keycloak from 'keycloak-js';
import type { AnyContainer } from '$lib/models';

export default async function saveContainerUser(keycloak: Keycloak, container: AnyContainer) {
	// Ensure a fresh token will be included in the Authorization header.
	await keycloak.updateToken(-1).catch(() => null);

	return await fetch(`/container/${container.guid}/user`, {
		body: JSON.stringify(container.user),
		method: 'POST',
		headers: {
			Authorization: `Bearer ${keycloak.token}`,
			'Content-Type': 'application/json'
		}
	});
}
