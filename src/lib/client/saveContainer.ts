import { z } from 'zod';
import { env } from '$env/dynamic/public';
import { modifiedContainer, newContainer } from '$lib/models';
import type { AnyContainer } from '$lib/models';
import type Keycloak from 'keycloak-js';

export default async function saveContainer(keycloak: Keycloak, container: AnyContainer) {
	let url = '/container';
	if (container.revision) {
		url = `/container/${container.guid}/revision`;
	}

	const data = z.union([modifiedContainer, newContainer]).parse({
		...container,
		realm: env.PUBLIC_KC_REALM,
		relation: container.relation
			.filter((r) => ('guid' in container ? r.subject == container.revision : true))
			.map(({ object, position, predicate }) => ({
				predicate,
				object,
				position
			}))
	});

	// Ensure a fresh token will be included in the Authorization header.
	await keycloak.updateToken(-1).catch(() => null);

	return await fetch(url, {
		method: 'POST',
		body: JSON.stringify(data),
		headers: {
			Authorization: `Bearer ${keycloak.token}`,
			'Content-Type': 'application/json'
		}
	});
}
