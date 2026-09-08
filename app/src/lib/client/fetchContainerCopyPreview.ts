import { templateCopyPreview, type ContainerCopyPreviewRequest } from '$lib/containerCopy';
import withRequestCoalescing from '$lib/client/withRequestCoalescing';

export default async function fetchContainerCopyPreview(
	request: ContainerCopyPreviewRequest,
	init?: RequestInit
) {
	const { availableIn, sourceGuid } = request;
	const params = new URLSearchParams({ sourceGuid });
	if (availableIn !== null) {
		params.set('availableIn', availableIn);
	}

	const response = await withRequestCoalescing(fetch)(`/container/copy?${params}`, init);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch container copy preview: ${response.status} ${await response.clone().text()}`
		);
	}

	return templateCopyPreview.parse(await response.clone().json());
}
