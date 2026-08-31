import type { AnyPayload, Container, UserGrantSet } from '$lib/models';

export default async function saveGrants(container: Container<AnyPayload>, grantSet: UserGrantSet) {
	return await fetch(`/container/${container.guid}/grant`, {
		body: JSON.stringify(grantSet),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		method: 'POST'
	});
}
