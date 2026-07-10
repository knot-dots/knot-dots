import { resolve } from '$app/paths';
import type { AnyPayload, Container } from '$lib/models';

export default async function publishAll(container: Container<AnyPayload>) {
	return fetch(resolve('/container/[guid=uuid]/publish-all', { guid: container.guid }), {
		method: 'POST'
	});
}
