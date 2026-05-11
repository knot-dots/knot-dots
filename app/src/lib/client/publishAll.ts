import { resolve } from '$app/paths';
import type { AnyContainer } from '$lib/models';

export default async function publishAll(container: AnyContainer) {
	return fetch(resolve('/container/[guid=uuid]/publish-all', { guid: container.guid }), {
		method: 'POST'
	});
}
