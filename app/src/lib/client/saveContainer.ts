import { z } from 'zod';
import { env } from '$env/dynamic/public';
import {
	type AnyPayload,
	type Container,
	etag,
	modifiedContainer,
	type NewContainer,
	newContainer
} from '$lib/models';

export default async function saveContainer(container: Container<AnyPayload> | NewContainer) {
	let url = '/container';
	if ('guid' in container) {
		url = `/container/${container.guid}/revision`;
	}

	const data = z.union([modifiedContainer, newContainer]).parse({
		...container,
		realm: env.PUBLIC_KC_REALM,
		relation: container.relation.filter((r) =>
			'guid' in container ? r.subject == container.guid || r.object == container.guid : true
		)
	});

	return await fetch(url, {
		method: 'POST',
		body: JSON.stringify(data),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...('revision' in container ? { 'If-Match': etag(container) } : undefined)
		}
	});
}
