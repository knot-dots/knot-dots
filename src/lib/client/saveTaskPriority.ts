import type Keycloak from 'keycloak-js';
import type { TaskPriority } from '$lib/models';

export default async function saveTaskPriority(keycloak: Keycloak, taskPriority: TaskPriority[]) {
	const url = '/task-priority';

	// Ensure a fresh token will be included in the Authorization header.
	await keycloak.updateToken(-1).catch(() => null);

	return await fetch(url, {
		method: 'POST',
		body: JSON.stringify(taskPriority),
		headers: {
			Authorization: `Bearer ${keycloak.token}`,
			'Content-Type': 'application/json'
		}
	});
}
