import { z } from 'zod';
import type Keycloak from 'keycloak-js';
import { user } from '$lib/models';
import type { User } from '$lib/models';

export default async function fetchMembers(keycloak: Keycloak, guid: string): Promise<User[]> {
	// Ensure a fresh token will be included in the Authorization header.
	await keycloak.updateToken(-1).catch(() => null);

	const response = await fetch(`/container/${guid}/user`, {
		headers: {
			Authorization: `Bearer ${keycloak.token}`
		}
	});

	return z.array(user).parse(await response.json());
}
