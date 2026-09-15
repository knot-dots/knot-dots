import type { AnyPayload, Container, GrantSetAssignment } from '$lib/models';

export default async function saveGrants(
	container: Container<AnyPayload>,
	assignment: GrantSetAssignment
) {
	return await fetch(`/container/${container.guid}/grant`, {
		body: JSON.stringify(assignment),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		},
		method: 'POST'
	});
}
