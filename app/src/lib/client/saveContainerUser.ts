import type { AnyPayload, Container } from '$lib/models';

export default async function saveContainerUser(container: Container<AnyPayload>) {
	return await fetch(`/container/${container.guid}/user`, {
		body: JSON.stringify(container.user),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		method: 'POST'
	});
}
