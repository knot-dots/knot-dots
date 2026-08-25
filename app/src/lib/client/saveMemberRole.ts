import type { AnyPayload, Container, MemberRoleAssignment } from '$lib/models';

export default async function saveMemberRole(
	container: Container<AnyPayload>,
	assignment: MemberRoleAssignment
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
