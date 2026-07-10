import { type AnyPayload, type Container, etag } from '$lib/models';
import { lastDeletedContainers } from '$lib/stores';

export default async function deleteContainer(container: Container<AnyPayload>) {
	const response = await fetch(`/container/${container.guid}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'If-Match': etag(container)
		}
	});

	if (response.ok) {
		lastDeletedContainers.update(
			(containers) => new Map([...containers, [container.guid, container]])
		);
	}

	return response;
}
