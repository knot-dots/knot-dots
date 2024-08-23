import { etag } from '$lib/models';
import type { AnyContainer } from '$lib/models';

export default async function deleteContainer(container: AnyContainer) {
	return await fetch(`/container/${container.guid}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'If-Match': etag(container)
		}
	});
}
