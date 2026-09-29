import type { AnyPayload, Container } from '$lib/models';

export default async function saveGrantInheritance(
	container: Container<AnyPayload>,
	inherit: boolean
) {
	return await fetch(`/container/${container.guid}/grant-inheritance`, {
		body: JSON.stringify({ inherit }),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		method: 'POST'
	});
}
