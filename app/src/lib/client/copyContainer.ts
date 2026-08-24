import { containerCopyRequest, type ContainerCopyRequest } from '$lib/containerCopy';
import { lastCreatedContainers } from '$lib/stores';

export default async function copyContainer(
	request: ContainerCopyRequest,
	optimisticUpdate: boolean = true
) {
	const data = containerCopyRequest.parse(request);
	const response = await fetch('/container/copy', {
		method: 'POST',
		body: JSON.stringify(data),
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' }
	});

	if (response.ok && optimisticUpdate) {
		response
			.clone()
			.json()
			.then((savedContainer) => {
				lastCreatedContainers.update(
					(map) => new Map([...map, [savedContainer.guid, savedContainer]])
				);
			});
	}

	return response;
}
