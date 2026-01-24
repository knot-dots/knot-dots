import { type AnyPayload, type Container, etag } from '$lib/models';

export default async function deleteContainer(container: Container<AnyPayload>) {
	return await fetch(`/container/${container.guid}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'If-Match': etag(container)
		}
	});
}
