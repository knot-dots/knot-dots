import { z } from 'zod';
import { env } from '$env/dynamic/public';
import { etag, modifiedContainer, type NewContainer, newContainer } from '$lib/models';
import type { AnyContainer } from '$lib/models';
import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';

export default async function saveContainer(container: AnyContainer | NewContainer) {
	let url = '/container';
	const isUpdate = 'guid' in container;
	if (isUpdate) {
		url = `/container/${container.guid}/revision`;
	}

	const data = z.union([modifiedContainer, newContainer]).parse({
		...container,
		realm: env.PUBLIC_KC_REALM,
		relation: container.relation.filter((r) =>
			'guid' in container ? r.subject == container.guid || r.object == container.guid : true
		)
	});

	const response = await fetch(url, {
		method: 'POST',
		body: JSON.stringify(data),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...('revision' in container ? { 'If-Match': etag(container) } : undefined)
		}
	});

	if (response.ok) {
		const cloned = response.clone();
		cloned.json().then((savedContainer) => {
			if (isUpdate) {
				lastUpdatedContainers.update(
					(map) => new Map([...map, [savedContainer.guid, savedContainer]])
				);
			} else {
				lastCreatedContainer.set(savedContainer);
			}
		});
	}

	return response;
}
